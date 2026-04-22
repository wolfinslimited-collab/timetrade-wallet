

## Fix Flutter iOS Build — Code Signing Failure

The Flutter iOS CI build fails at archive time with "No valid code signing certificates were found" because the Python-based signing patch in the workflow only matches a narrow set of strings in the generated `project.pbxproj`. Flutter 3.24's `flutter create --platforms=ios` produces different signing patterns than what the script expects.

The working Capacitor iOS workflow (`.github/workflows/build-ios.yml`) already solves this with comprehensive sed-based replacements that cover every known Xcode signing variant.

### What Changes

**File: `.github/workflows/build-flutter-ios.yml`**

Replace the "Apply signing to generated Runner project" step's Python script with the same battle-tested sed approach used in the Capacitor iOS workflow:

1. Replace ALL `CODE_SIGN_STYLE = Automatic` with `Manual`
2. Replace ALL `DEVELOPMENT_TEAM` values (including empty ones) with the extracted team ID
3. Replace ALL `PROVISIONING_PROFILE_SPECIFIER` values with the profile name, and inject it if missing
4. Replace ALL `CODE_SIGN_IDENTITY` variants — `"Apple Development"`, `"iPhone Developer"`, `"iPhone Distribution"`, empty strings, and the SDK-specific `CODE_SIGN_IDENTITY[sdk=iphoneos*]` key — with `"Apple Distribution"`
5. Inject `CODE_SIGN_IDENTITY` if it does not exist at all in the file
6. Add a verification grep at the end to confirm all settings were applied

Additionally, add `security set-key-partition-list` call which is already present but verify it runs before the build step (it is present — confirmed).

### Technical Detail

The current Python script does exact string replacements like:
```python
text = re.sub(r'CODE_SIGN_IDENTITY = "Apple Development";', ...)
```

This misses patterns Flutter 3.24 actually generates. The fix switches to sed with broader regex patterns:
```bash
sed -i '' 's|CODE_SIGN_IDENTITY = "[^"]*";|CODE_SIGN_IDENTITY = "Apple Distribution";|g' "$PBXPROJ"
```

This catches any value inside the quotes, eliminating the root cause.

### No Other Files Affected

Only `.github/workflows/build-flutter-ios.yml` needs updating. The Capacitor iOS workflow, edge functions, and app code are untouched.

