import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_GITHUB_REPO = "wolfinslimited-collab/timetrade-wallet";

const WORKFLOW_MAP: Record<string, string> = {
  android: "build-android.yml",
  ios: "build-ios.yml",
  flutter_android: "build-flutter-android.yml",
  flutter_ios: "build-flutter-ios.yml",
};

const REPOSITORY_DISPATCH_EVENT_MAP: Record<string, string> = {
  android: "build_android",
  ios: "build_ios",
  flutter_android: "build_flutter_android",
  flutter_ios: "build_flutter_ios",
};

const WORKFLOW_TEMPLATES: Record<string, string> = {
  ios: `name: Build iOS (Capacitor)

on:
  workflow_dispatch:
    inputs:
      build_id:
        description: "Build record ID from Build Center"
        required: true
        type: string
  repository_dispatch:
    types: [build_ios]

jobs:
  build-ios:
    runs-on: macos-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Install dependencies
        run: npm install

      - name: Build web app
        run: npm run build

      - name: Add iOS platform
        run: npx cap add ios || true

      - name: Sync Capacitor
        run: npx cap sync ios

      - name: Prepare app icon source
        run: |
          mkdir -p assets
          mkdir -p \$RUNNER_TEMP/icon-audit
          if [ -f public/app-logo.png ]; then
            SOURCE_PATH="public/app-logo.png"
          elif [ -f public/app-logo.jpg ]; then
            SOURCE_PATH="public/app-logo.jpg"
          elif [ -f public/app-logo.jpeg ]; then
            SOURCE_PATH="public/app-logo.jpeg"
          else
            echo "FATAL: Missing app logo: add public/app-logo.png"
            exit 1
          fi

          sips -s format png "\$SOURCE_PATH" --out assets/icon.png
          sips -z 1024 1024 assets/icon.png --out assets/icon.png

          TMP_JPG="\$(mktemp).jpg"
          sips -s format jpeg -s formatOptions 100 assets/icon.png --out "\$TMP_JPG"
          sips -s format png "\$TMP_JPG" --out assets/icon.png
          rm -f "\$TMP_JPG"

          ALPHA=\$(sips -g hasAlpha assets/icon.png | awk -F': ' '/hasAlpha/ {print tolower($2)}')
          WIDTH=\$(sips -g pixelWidth assets/icon.png | awk -F': ' '/pixelWidth/ {print $2}')
          HEIGHT=\$(sips -g pixelHeight assets/icon.png | awk -F': ' '/pixelHeight/ {print $2}')
          FORMAT=\$(sips -g format assets/icon.png | awk -F': ' '/format/ {print tolower($2)}')

          echo "source=\$SOURCE_PATH" > \$RUNNER_TEMP/icon-audit/source-meta.txt
          echo "width=\$WIDTH" >> \$RUNNER_TEMP/icon-audit/source-meta.txt
          echo "height=\$HEIGHT" >> \$RUNNER_TEMP/icon-audit/source-meta.txt
          echo "hasAlpha=\$ALPHA" >> \$RUNNER_TEMP/icon-audit/source-meta.txt
          echo "format=\$FORMAT" >> \$RUNNER_TEMP/icon-audit/source-meta.txt

          if [ "\$FORMAT" != "png" ]; then
            echo "FATAL: Icon is not PNG after conversion"
            exit 1
          fi
          if [ "\$WIDTH" != "1024" ] || [ "\$HEIGHT" != "1024" ]; then
            echo "FATAL: Icon is not 1024x1024"
            exit 1
          fi
          echo "Icon prepared: \${WIDTH}x\${HEIGHT}, hasAlpha=\$ALPHA, format=\$FORMAT"

      - name: Generate iOS app icons
        run: |
          # Remove ALL existing AppIcon directories to prevent Capacitor conflicts
          find ios/ -name "AppIcon.appiconset" -type d -exec rm -rf {} + 2>/dev/null || true

          ICON_DIR="ios/App/App/Assets.xcassets/AppIcon.appiconset"
          mkdir -p "\$ICON_DIR"

          jq -n '{
            "images": [
              {"filename": "AppIcon-20x20@2x.png", "idiom": "iphone", "scale": "2x", "size": "20x20"},
              {"filename": "AppIcon-20x20@3x.png", "idiom": "iphone", "scale": "3x", "size": "20x20"},
              {"filename": "AppIcon-29x29@2x.png", "idiom": "iphone", "scale": "2x", "size": "29x29"},
              {"filename": "AppIcon-29x29@3x.png", "idiom": "iphone", "scale": "3x", "size": "29x29"},
              {"filename": "AppIcon-40x40@2x.png", "idiom": "iphone", "scale": "2x", "size": "40x40"},
              {"filename": "AppIcon-40x40@3x.png", "idiom": "iphone", "scale": "3x", "size": "40x40"},
              {"filename": "AppIcon-60x60@2x.png", "idiom": "iphone", "scale": "2x", "size": "60x60"},
              {"filename": "AppIcon-60x60@3x.png", "idiom": "iphone", "scale": "3x", "size": "60x60"},
              {"filename": "AppIcon-20x20@1x.png", "idiom": "ipad", "scale": "1x", "size": "20x20"},
              {"filename": "AppIcon-20x20@2x-ipad.png", "idiom": "ipad", "scale": "2x", "size": "20x20"},
              {"filename": "AppIcon-29x29@1x.png", "idiom": "ipad", "scale": "1x", "size": "29x29"},
              {"filename": "AppIcon-29x29@2x-ipad.png", "idiom": "ipad", "scale": "2x", "size": "29x29"},
              {"filename": "AppIcon-40x40@1x.png", "idiom": "ipad", "scale": "1x", "size": "40x40"},
              {"filename": "AppIcon-40x40@2x-ipad.png", "idiom": "ipad", "scale": "2x", "size": "40x40"},
              {"filename": "AppIcon-76x76@1x.png", "idiom": "ipad", "scale": "1x", "size": "76x76"},
              {"filename": "AppIcon-76x76@2x.png", "idiom": "ipad", "scale": "2x", "size": "76x76"},
              {"filename": "AppIcon-83.5x83.5@2x.png", "idiom": "ipad", "scale": "2x", "size": "83.5x83.5"},
              {"filename": "AppIcon-1024x1024@1x.png", "idiom": "ios-marketing", "scale": "1x", "size": "1024x1024"}
            ],
            "info": {"author": "xcode", "version": 1}
          }' > "\$ICON_DIR/Contents.json"

          for SPEC in \\
            "40 AppIcon-20x20@2x.png" \\
            "60 AppIcon-20x20@3x.png" \\
            "58 AppIcon-29x29@2x.png" \\
            "87 AppIcon-29x29@3x.png" \\
            "80 AppIcon-40x40@2x.png" \\
            "120 AppIcon-40x40@3x.png" \\
            "120 AppIcon-60x60@2x.png" \\
            "180 AppIcon-60x60@3x.png" \\
            "20 AppIcon-20x20@1x.png" \\
            "40 AppIcon-20x20@2x-ipad.png" \\
            "29 AppIcon-29x29@1x.png" \\
            "58 AppIcon-29x29@2x-ipad.png" \\
            "40 AppIcon-40x40@1x.png" \\
            "80 AppIcon-40x40@2x-ipad.png" \\
            "76 AppIcon-76x76@1x.png" \\
            "152 AppIcon-76x76@2x.png" \\
            "167 AppIcon-83.5x83.5@2x.png" \\
            "1024 AppIcon-1024x1024@1x.png"
          do
            PX="\${SPEC%% *}"
            FILE_NAME="\${SPEC#* }"
            sips -z "\$PX" "\$PX" assets/icon.png --out "\$ICON_DIR/\$FILE_NAME" >/dev/null
          done

          EXPECTED=18
          ACTUAL=\$(ls -1 "\$ICON_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
          echo "Generated \$ACTUAL of \$EXPECTED icon files"
          if [ "\$ACTUAL" -lt "\$EXPECTED" ]; then
            echo "FATAL: Missing icon files!"
            exit 1
          fi

          ls -la "\$ICON_DIR/" > \$RUNNER_TEMP/icon-audit/appiconset-listing.txt
          cp "\$ICON_DIR/Contents.json" \$RUNNER_TEMP/icon-audit/Contents.json
          echo "All \$ACTUAL icons generated successfully"

      - name: Remove alpha channel from all icons
        run: |
          ICON_DIR="ios/App/App/Assets.xcassets/AppIcon.appiconset"
          for IMG in "\$ICON_DIR"/*.png; do
            if [ -f "\$IMG" ]; then
              TMP_JPG="\$(mktemp).jpg"
              sips -s format jpeg -s formatOptions 100 "\$IMG" --out "\$TMP_JPG"
              sips -s format png "\$TMP_JPG" --out "\$IMG"
              rm -f "\$TMP_JPG"
            fi
          done

          MARKETING_ICON="\$ICON_DIR/AppIcon-1024x1024@1x.png"
          test -f "\$MARKETING_ICON" || (echo "FATAL: Missing 1024x1024 marketing icon" && exit 1)
          WIDTH=\$(sips -g pixelWidth "\$MARKETING_ICON" | awk -F': ' '/pixelWidth/ {print $2}')
          HEIGHT=\$(sips -g pixelHeight "\$MARKETING_ICON" | awk -F': ' '/pixelHeight/ {print $2}')
          ALPHA=\$(sips -g hasAlpha "\$MARKETING_ICON" | awk -F': ' '/hasAlpha/ {print tolower($2)}')
          echo "Marketing icon: \${WIDTH}x\${HEIGHT}, hasAlpha=\$ALPHA"
          if [ "\$WIDTH" != "1024" ] || [ "\$HEIGHT" != "1024" ]; then
            echo "FATAL: Marketing icon is not 1024x1024"
            exit 1
          fi

      - name: Ensure Info.plist icon mapping
        run: |
          PLIST="ios/App/App/Info.plist"
          /usr/libexec/PlistBuddy -c "Delete :CFBundleIcons" "\$PLIST" || true
          /usr/libexec/PlistBuddy -c "Delete :CFBundleIcons~ipad" "\$PLIST" || true

          /usr/libexec/PlistBuddy -c "Add :CFBundleIcons dict" "\$PLIST"
          /usr/libexec/PlistBuddy -c "Add :CFBundleIcons:CFBundlePrimaryIcon dict" "\$PLIST"
          /usr/libexec/PlistBuddy -c "Add :CFBundleIcons:CFBundlePrimaryIcon:CFBundleIconName string AppIcon" "\$PLIST"
          /usr/libexec/PlistBuddy -c "Add :CFBundleIcons:CFBundlePrimaryIcon:CFBundleIconFiles array" "\$PLIST"
          /usr/libexec/PlistBuddy -c "Add :CFBundleIcons:CFBundlePrimaryIcon:CFBundleIconFiles:0 string AppIcon" "\$PLIST"

          /usr/libexec/PlistBuddy -c "Add :CFBundleIcons~ipad dict" "\$PLIST"
          /usr/libexec/PlistBuddy -c "Add :CFBundleIcons~ipad:CFBundlePrimaryIcon dict" "\$PLIST"
          /usr/libexec/PlistBuddy -c "Add :CFBundleIcons~ipad:CFBundlePrimaryIcon:CFBundleIconName string AppIcon" "\$PLIST"
          /usr/libexec/PlistBuddy -c "Add :CFBundleIcons~ipad:CFBundlePrimaryIcon:CFBundleIconFiles array" "\$PLIST"
          /usr/libexec/PlistBuddy -c "Add :CFBundleIcons~ipad:CFBundlePrimaryIcon:CFBundleIconFiles:0 string AppIcon" "\$PLIST"

          echo "Info.plist icon mapping set"

      - name: Set iOS build number
        run: |
          BUILD_NUMBER="\${GITHUB_RUN_NUMBER}.\${GITHUB_RUN_ATTEMPT}"
          echo "BUILD_NUMBER=\$BUILD_NUMBER" >> "\$GITHUB_ENV"
          PLIST="ios/App/App/Info.plist"
          /usr/libexec/PlistBuddy -c "Set :CFBundleVersion \$BUILD_NUMBER" "\$PLIST"
          PBXPROJ="ios/App/App.xcodeproj/project.pbxproj"
          if [ -f "\$PBXPROJ" ]; then
            sed -i '' "s/CURRENT_PROJECT_VERSION = [^;]*;/CURRENT_PROJECT_VERSION = \$BUILD_NUMBER;/g" "\$PBXPROJ"
          fi

      - name: Setup signing assets
        env:
          BUILD_CERTIFICATE_BASE64: \${{ secrets.BUILD_CERTIFICATE_BASE64 }}
          P12_PASSWORD: \${{ secrets.P12_PASSWORD }}
          BUILD_PROVISION_PROFILE_BASE64: \${{ secrets.BUILD_PROVISION_PROFILE_BASE64 }}
        run: |
          CERT_PATH=\$RUNNER_TEMP/build_certificate.p12
          PP_PATH=\$RUNNER_TEMP/build_pp.mobileprovision
          KEYCHAIN_PATH=\$RUNNER_TEMP/app-signing.keychain-db
          PROFILE_PLIST=\$RUNNER_TEMP/profile.plist

          echo -n "\$BUILD_CERTIFICATE_BASE64" | base64 --decode -o "\$CERT_PATH"
          echo -n "\$BUILD_PROVISION_PROFILE_BASE64" | base64 --decode -o "\$PP_PATH"

          security cms -D -i "\$PP_PATH" > "\$PROFILE_PLIST"
          PROFILE_NAME=\$(/usr/libexec/PlistBuddy -c "Print :Name" "\$PROFILE_PLIST")
          PROFILE_UUID=\$(/usr/libexec/PlistBuddy -c "Print :UUID" "\$PROFILE_PLIST")
          TEAM_ID=\$(/usr/libexec/PlistBuddy -c "Print :TeamIdentifier:0" "\$PROFILE_PLIST")
          BUNDLE_ID=\$(/usr/libexec/PlistBuddy -c "Print :Entitlements:application-identifier" "\$PROFILE_PLIST" | sed "s/^\${TEAM_ID}\\\\.//" )

          echo "TEAM_ID=\$TEAM_ID" >> "\$GITHUB_ENV"
          echo "PROFILE_NAME=\$PROFILE_NAME" >> "\$GITHUB_ENV"
          echo "BUNDLE_ID=\$BUNDLE_ID" >> "\$GITHUB_ENV"

          security create-keychain -p "\$P12_PASSWORD" "\$KEYCHAIN_PATH"
          security set-keychain-settings -lut 21600 "\$KEYCHAIN_PATH"
          security unlock-keychain -p "\$P12_PASSWORD" "\$KEYCHAIN_PATH"
          security import "\$CERT_PATH" -P "\$P12_PASSWORD" -A -t cert -f pkcs12 -k "\$KEYCHAIN_PATH"
          security list-keychain -d user -s "\$KEYCHAIN_PATH"

          mkdir -p "\$HOME/Library/MobileDevice/Provisioning Profiles"
          cp "\$PP_PATH" "\$HOME/Library/MobileDevice/Provisioning Profiles/\$PROFILE_UUID.mobileprovision"

          PBXPROJ="ios/App/App.xcodeproj/project.pbxproj"
          if [ -f "\$PBXPROJ" ]; then
            sed -i '' "s/CODE_SIGN_STYLE = Automatic;/CODE_SIGN_STYLE = Manual;/g" "\$PBXPROJ"
            sed -i '' "s/DEVELOPMENT_TEAM = [^;]*;/DEVELOPMENT_TEAM = \$TEAM_ID;/g" "\$PBXPROJ"
            sed -i '' "s/PROVISIONING_PROFILE_SPECIFIER = [^;]*;/PROVISIONING_PROFILE_SPECIFIER = \\"\$PROFILE_NAME\\";/g" "\$PBXPROJ"
            if ! grep -q "PROVISIONING_PROFILE_SPECIFIER" "\$PBXPROJ"; then
              sed -i '' "s/CODE_SIGN_STYLE = Manual;/CODE_SIGN_STYLE = Manual;\\n\\t\\t\\t\\tPROVISIONING_PROFILE_SPECIFIER = \\"\$PROFILE_NAME\\";/g" "\$PBXPROJ"
            fi
          fi

          cat > ios/App/ExportOptions.plist << EXPORTEOF
          <?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
          <plist version="1.0">
          <dict>
            <key>method</key>
            <string>app-store-connect</string>
            <key>teamID</key>
            <string>\$TEAM_ID</string>
            <key>uploadBitcode</key>
            <false/>
            <key>uploadSymbols</key>
            <true/>
            <key>signingStyle</key>
            <string>manual</string>
            <key>provisioningProfiles</key>
            <dict>
              <key>\$BUNDLE_ID</key>
              <string>\$PROFILE_NAME</string>
            </dict>
          </dict>
          </plist>
          EXPORTEOF

      - name: Build Xcode archive
        run: |
          cd ios/App
          xcodebuild -project App.xcodeproj \\
            -scheme App \\
            -sdk iphoneos \\
            -configuration Release \\
            -archivePath \$RUNNER_TEMP/App.xcarchive \\
            archive \\
            CODE_SIGN_STYLE=Manual \\
            DEVELOPMENT_TEAM="\$TEAM_ID" \\
            CODE_SIGN_IDENTITY="Apple Distribution" \\
            PROVISIONING_PROFILE_SPECIFIER="\$PROFILE_NAME" \\
            CURRENT_PROJECT_VERSION="\$BUILD_NUMBER" \\
            ASSETCATALOG_COMPILER_APPICON_NAME=AppIcon

      - name: Validate archived icon payload (strict)
        run: |
          ARCHIVE_APP="\$RUNNER_TEMP/App.xcarchive/Products/Applications/App.app"
          test -f "\$ARCHIVE_APP/Assets.car" || (echo "FATAL: Missing Assets.car in archive" && exit 1)
          test -f "\$ARCHIVE_APP/Info.plist" || (echo "FATAL: Missing Info.plist in archive" && exit 1)

          ICON_NAME=\$(/usr/libexec/PlistBuddy -c "Print :CFBundleIcons:CFBundlePrimaryIcon:CFBundleIconName" "\$ARCHIVE_APP/Info.plist" 2>/dev/null || true)
          if [ "\$ICON_NAME" != "AppIcon" ]; then
            echo "FATAL: CFBundleIconName='\$ICON_NAME' (expected 'AppIcon')"
            exit 1
          fi

          ARCHIVE_ASSET_INFO="\$RUNNER_TEMP/icon-audit/archive-assetutil.json"
          xcrun --sdk iphoneos assetutil --info "\$ARCHIVE_APP/Assets.car" > "\$ARCHIVE_ASSET_INFO" 2>/dev/null || (echo "FATAL: Could not inspect Assets.car" && exit 1)

          MARKETING_COUNT=\$(jq '[.[] | select((.Name? // "") == "AppIcon" and ((.PixelWidth? // 0) == 1024) and ((.PixelHeight? // 0) == 1024))] | length' "\$ARCHIVE_ASSET_INFO")
          IPHONE_COUNT=\$(jq '[.[] | select((.Name? // "") == "AppIcon" and ((.Idiom? // "") == "phone"))] | length' "\$ARCHIVE_ASSET_INFO")
          IPAD_COUNT=\$(jq '[.[] | select((.Name? // "") == "AppIcon" and ((.Idiom? // "") == "pad"))] | length' "\$ARCHIVE_ASSET_INFO")

          echo "Archive icon renditions: marketing(1024x1024)=\$MARKETING_COUNT, iphone=\$IPHONE_COUNT, ipad=\$IPAD_COUNT"

          if [ "\$MARKETING_COUNT" -lt 1 ]; then
            echo "FATAL: No 1024x1024 AppIcon rendition found in archive Assets.car"
            jq '[.[] | select((.Name? // "") == "AppIcon")]' "\$ARCHIVE_ASSET_INFO"
            exit 1
          fi
          if [ "\$IPHONE_COUNT" -lt 1 ]; then
            echo "FATAL: No iphone AppIcon renditions in archive"
            exit 1
          fi

          /usr/libexec/PlistBuddy -c "Print :CFBundleIcons" "\$ARCHIVE_APP/Info.plist" > \$RUNNER_TEMP/icon-audit/archive-plist-icons.txt 2>&1 || true
          echo "Archive icon payload validated"

      - name: Export IPA
        run: |
          xcodebuild -exportArchive -archivePath \$RUNNER_TEMP/App.xcarchive -exportOptionsPlist ios/App/ExportOptions.plist -exportPath \$RUNNER_TEMP/ipa-output

      - name: Upload IPA artifact
        uses: actions/upload-artifact@v4
        with:
          name: ios-ipa-\${{ github.run_id }}
          path: \${{ runner.temp }}/ipa-output/*.ipa
          if-no-files-found: error

      - name: Validate IPA contains icons (strict)
        run: |
          IPA_PATH=\$(find \$RUNNER_TEMP/ipa-output -name "*.ipa" | head -1)
          echo "Validating IPA: \$IPA_PATH"

          UNZIP_DIR="\$RUNNER_TEMP/ipa-check"
          mkdir -p "\$UNZIP_DIR"
          unzip -q "\$IPA_PATH" -d "\$UNZIP_DIR"

          APP_DIR=\$(find "\$UNZIP_DIR/Payload" -name "*.app" -type d | head -1)
          test -f "\$APP_DIR/Assets.car" || (echo "FATAL: Assets.car missing from IPA" && exit 1)

          ICON_NAME=\$(/usr/libexec/PlistBuddy -c "Print :CFBundleIcons:CFBundlePrimaryIcon:CFBundleIconName" "\$APP_DIR/Info.plist" 2>/dev/null || true)
          if [ "\$ICON_NAME" != "AppIcon" ]; then
            echo "FATAL: IPA CFBundleIconName='\$ICON_NAME' (expected 'AppIcon')"
            exit 1
          fi

          IPA_ASSET_INFO="\$RUNNER_TEMP/icon-audit/ipa-assetutil.json"
          xcrun --sdk iphoneos assetutil --info "\$APP_DIR/Assets.car" > "\$IPA_ASSET_INFO" 2>/dev/null || (echo "FATAL: Could not inspect IPA Assets.car" && exit 1)

          MARKETING_COUNT=\$(jq '[.[] | select((.Name? // "") == "AppIcon" and ((.PixelWidth? // 0) == 1024) and ((.PixelHeight? // 0) == 1024))] | length' "\$IPA_ASSET_INFO")
          IPHONE_COUNT=\$(jq '[.[] | select((.Name? // "") == "AppIcon" and ((.Idiom? // "") == "phone"))] | length' "\$IPA_ASSET_INFO")

          echo "IPA icon renditions: marketing(1024x1024)=\$MARKETING_COUNT, iphone=\$IPHONE_COUNT"

          if [ "\$MARKETING_COUNT" -lt 1 ]; then
            echo "FATAL: No 1024x1024 AppIcon rendition in IPA"
            jq '[.[] | select((.Name? // "") == "AppIcon")]' "\$IPA_ASSET_INFO"
            exit 1
          fi

          /usr/libexec/PlistBuddy -c "Print :CFBundleIcons" "\$APP_DIR/Info.plist" > \$RUNNER_TEMP/icon-audit/ipa-plist-icons.txt 2>&1 || true
          echo "IPA icon validation passed (marketing=\$MARKETING_COUNT, iphone=\$IPHONE_COUNT)"
          rm -rf "\$UNZIP_DIR"

      - name: Upload icon audit artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: icon-audit-\${{ github.run_id }}
          path: \${{ runner.temp }}/icon-audit/
          if-no-files-found: warn

      - name: Validate IPA with Apple
        env:
          APP_STORE_CONNECT_API_KEY_ID: \${{ secrets.APP_STORE_CONNECT_API_KEY_ID }}
          APP_STORE_CONNECT_ISSUER_ID: \${{ secrets.APP_STORE_CONNECT_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY_BASE64: \${{ secrets.APP_STORE_CONNECT_API_KEY_BASE64 }}
        run: |
          mkdir -p ~/private_keys
          echo -n "\$APP_STORE_CONNECT_API_KEY_BASE64" | base64 --decode > ~/private_keys/AuthKey_\${APP_STORE_CONNECT_API_KEY_ID}.p8
          IPA_PATH=\$(find \$RUNNER_TEMP/ipa-output -name "*.ipa" | head -1)
          echo "Validating IPA with Apple before upload..."
          xcrun altool --validate-app --type ios --file "\$IPA_PATH" --apiKey "\$APP_STORE_CONNECT_API_KEY_ID" --apiIssuer "\$APP_STORE_CONNECT_ISSUER_ID"
          echo "Apple validation passed"

      - name: Upload to TestFlight
        env:
          APP_STORE_CONNECT_API_KEY_ID: \${{ secrets.APP_STORE_CONNECT_API_KEY_ID }}
          APP_STORE_CONNECT_ISSUER_ID: \${{ secrets.APP_STORE_CONNECT_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY_BASE64: \${{ secrets.APP_STORE_CONNECT_API_KEY_BASE64 }}
        run: |
          IPA_PATH=\$(find \$RUNNER_TEMP/ipa-output -name "*.ipa" | head -1)
          echo "Uploading IPA: \$IPA_PATH"
          xcrun altool --upload-app \\
            --type ios \\
            --file "\$IPA_PATH" \\
            --apiKey "\$APP_STORE_CONNECT_API_KEY_ID" \\
            --apiIssuer "\$APP_STORE_CONNECT_ISSUER_ID"

      - name: Notify build complete
        if: always()
        run: |
          BUILD_ID="\${{ github.event.inputs.build_id || github.event.client_payload.build_id || 'n/a' }}"
          echo "Build ID \$BUILD_ID finished with status \${{ job.status }}"
`,
  android: `name: Build Android (Capacitor)

on:
  workflow_dispatch:
    inputs:
      build_id:
        description: "Build record ID from Build Center"
        required: true
        type: string
  repository_dispatch:
    types: [build_android]

jobs:
  build-android:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: "temurin"
          java-version: "21"

      - name: Install dependencies
        run: npm install

      - name: Build web app
        run: npm run build

      - name: Add Android platform
        run: npx cap add android || true

      - name: Sync Capacitor
        run: npx cap sync android

      - name: Set Android build number
        run: |
          VERSION_CODE=\$((GITHUB_RUN_NUMBER * 100 + GITHUB_RUN_ATTEMPT))
          VERSION_NAME="1.\${GITHUB_RUN_NUMBER}.\${GITHUB_RUN_ATTEMPT}"
          echo "ANDROID_VERSION_CODE=\$VERSION_CODE" >> "\$GITHUB_ENV"
          echo "ANDROID_VERSION_NAME=\$VERSION_NAME" >> "\$GITHUB_ENV"
          echo "Android versionCode: \$VERSION_CODE"
          echo "Android versionName: \$VERSION_NAME"

      - name: Prepare app icon source
        run: |
          mkdir -p assets
          if [ -f public/app-logo.png ]; then
            SOURCE_PATH="public/app-logo.png"
          elif [ -f public/app-logo.jpg ]; then
            SOURCE_PATH="public/app-logo.jpg"
          elif [ -f public/app-logo.jpeg ]; then
            SOURCE_PATH="public/app-logo.jpeg"
          else
            echo "Missing app logo: add public/app-logo.png or public/app-logo.jpg"
            exit 1
          fi

          if command -v magick &>/dev/null; then
            magick "$SOURCE_PATH" -resize 1024x1024! -alpha remove -alpha off PNG24:assets/icon.png
          elif command -v convert &>/dev/null; then
            convert "$SOURCE_PATH" -resize 1024x1024! -alpha remove -alpha off PNG24:assets/icon.png
          else
            sudo apt-get update
            sudo apt-get install -y imagemagick
            convert "$SOURCE_PATH" -resize 1024x1024! -alpha remove -alpha off PNG24:assets/icon.png
          fi

          echo "Icon prepared from $SOURCE_PATH: $(file assets/icon.png)"

      - name: Generate Android app icons
        run: npx --yes @capacitor/assets generate --android

      - name: Setup signing
        env:
          ANDROID_KEYSTORE_BASE64: \${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          ANDROID_KEYSTORE_PASSWORD: \${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: \${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: \${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          if [ -n "\$ANDROID_KEYSTORE_BASE64" ] || [ -n "\$ANDROID_KEYSTORE_PASSWORD" ] || [ -n "\$ANDROID_KEY_ALIAS" ] || [ -n "\$ANDROID_KEY_PASSWORD" ]; then
            if [ -z "\$ANDROID_KEYSTORE_BASE64" ] || [ -z "\$ANDROID_KEYSTORE_PASSWORD" ] || [ -z "\$ANDROID_KEY_ALIAS" ] || [ -z "\$ANDROID_KEY_PASSWORD" ]; then
              echo "Android signing is incomplete. Set ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, and ANDROID_KEY_PASSWORD."
              exit 1
            fi

            echo -n "\$ANDROID_KEYSTORE_BASE64" | base64 --decode > android/app/release.keystore
            cat > android/key.properties << KEYEOF
          storeFile=release.keystore
          storePassword=\$ANDROID_KEYSTORE_PASSWORD
          keyAlias=\$ANDROID_KEY_ALIAS
          keyPassword=\$ANDROID_KEY_PASSWORD
          KEYEOF
            echo "Signing configured for release build"
          else
            echo "No signing secrets provided, building debug APK"
          fi

      - name: Build APK
        run: |
          cd android
          chmod +x gradlew
          rm -rf ../build-artifacts/android-apk
          mkdir -p ../build-artifacts/android-apk
          if [ -f "key.properties" ]; then
            ./gradlew assembleRelease
            SIGNED_APK=$(find app/build/outputs/apk/release -maxdepth 1 -type f -name "*.apk" ! -name "*-unsigned.apk" | head -n 1)
            if [ -z "\$SIGNED_APK" ]; then
              echo "Release build completed without a signed APK"
              ls -la app/build/outputs/apk/release || true
              exit 1
            fi
            cp "\$SIGNED_APK" ../build-artifacts/android-apk/
            echo "Signed APK staged from \$SIGNED_APK"
            echo "Signed APK generated at \$SIGNED_APK"
          else
            ./gradlew assembleDebug
            DEBUG_APK=$(find app/build/outputs/apk/debug -maxdepth 1 -type f -name "*.apk" | head -n 1)
            if [ -z "\$DEBUG_APK" ]; then
              echo "Debug build completed without an APK"
              ls -la app/build/outputs/apk/debug || true
              exit 1
            fi
            cp "\$DEBUG_APK" ../build-artifacts/android-apk/
            echo "Debug APK staged from \$DEBUG_APK"
          fi
          ls -la ../build-artifacts/android-apk

      - name: Build AAB (for Play Store)
        run: |
          cd android
          rm -rf ../build-artifacts/android-aab
          mkdir -p ../build-artifacts/android-aab
          if [ -f "key.properties" ]; then
            ./gradlew bundleRelease
            AAB_PATH=$(find app/build/outputs/bundle/release -maxdepth 1 -type f -name "*.aab" | head -n 1)
            if [ -z "\$AAB_PATH" ]; then
              echo "Release bundle completed without an AAB"
              ls -la app/build/outputs/bundle/release || true
              exit 1
            fi
            cp "\$AAB_PATH" ../build-artifacts/android-aab/
            echo "Release AAB staged from \$AAB_PATH"
          fi

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: android-apk-\${{ github.run_id }}
          path: build-artifacts/android-apk/*
          if-no-files-found: error

      - name: Upload AAB artifact
        uses: actions/upload-artifact@v4
        if: \${{ hashFiles('build-artifacts/android-aab/*.aab') != '' }}
        with:
          name: android-aab-\${{ github.run_id }}
          path: build-artifacts/android-aab/*.aab

      - name: Notify build complete
        if: always()
        run: |
          BUILD_ID="\${{ github.event.inputs.build_id || github.event.client_payload.build_id || 'n/a' }}"
          echo "Build ID \$BUILD_ID finished with status \${{ job.status }}"
`,
  flutter_android: `name: Build Flutter Android

on:
  workflow_dispatch:
    inputs:
      build_id:
        description: "Build record ID from Build Center"
        required: true
        type: string
  repository_dispatch:
    types: [build_flutter_android]

jobs:
  build-android:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: "temurin"
          java-version: "17"

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: "3.24.0"
          channel: "stable"
          cache: true

      - name: Install dependencies
        run: |
          cd flutter_app
          flutter pub get

      - name: Setup signing
        env:
          ANDROID_KEYSTORE_BASE64: \${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          ANDROID_KEYSTORE_PASSWORD: \${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: \${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: \${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          cd flutter_app
          if [ -n "\$ANDROID_KEYSTORE_BASE64" ]; then
            echo -n "\$ANDROID_KEYSTORE_BASE64" | base64 --decode > android/app/release.keystore
            cat > android/key.properties << EOF
          storePassword=\$ANDROID_KEYSTORE_PASSWORD
          keyPassword=\$ANDROID_KEY_PASSWORD
          keyAlias=\$ANDROID_KEY_ALIAS
          storeFile=release.keystore
          EOF
            echo "Signing configured for release build"
          else
            echo "No signing keystore provided, building debug APK"
          fi

      - name: Build APK
        run: |
          cd flutter_app
          if [ -f "android/key.properties" ]; then
            flutter build apk --release
          else
            flutter build apk --debug
          fi

      - name: Build AAB (for Play Store)
        run: |
          cd flutter_app
          if [ -f "android/key.properties" ]; then
            flutter build appbundle --release
          fi

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: flutter-android-apk-\${{ github.run_id }}
          path: flutter_app/build/app/outputs/flutter-apk/*.apk
          if-no-files-found: warn

      - name: Upload AAB artifact
        uses: actions/upload-artifact@v4
        if: \${{ hashFiles('flutter_app/build/app/outputs/bundle/release/*.aab') != '' }}
        with:
          name: flutter-android-aab-\${{ github.run_id }}
          path: flutter_app/build/app/outputs/bundle/release/*.aab

      - name: Notify build complete
        if: always()
        run: |
          BUILD_ID="\${{ github.event.inputs.build_id || github.event.client_payload.build_id || 'n/a' }}"
          echo "Flutter Android Build ID \$BUILD_ID finished with status \${{ job.status }}"
`,
  flutter_ios: `name: Build Flutter iOS

on:
  workflow_dispatch:
    inputs:
      build_id:
        description: "Build record ID from Build Center"
        required: true
        type: string
  repository_dispatch:
    types: [build_flutter_ios]

jobs:
  build-ios:
    runs-on: macos-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: "3.24.0"
          channel: "stable"
          cache: true

      - name: Install dependencies
        run: |
          cd flutter_app
          flutter pub get

      - name: Generate iOS project
        run: |
          cd flutter_app
          flutter create --platforms=ios .

      - name: Set build number
        run: |
          BUILD_NUMBER="\${GITHUB_RUN_NUMBER}.\${GITHUB_RUN_ATTEMPT}"
          echo "BUILD_NUMBER=\$BUILD_NUMBER" >> "\$GITHUB_ENV"
          echo "Setting build number to \$BUILD_NUMBER"

      - name: Setup signing assets
        env:
          BUILD_CERTIFICATE_BASE64: \${{ secrets.BUILD_CERTIFICATE_BASE64 }}
          P12_PASSWORD: \${{ secrets.P12_PASSWORD }}
          BUILD_PROVISION_PROFILE_BASE64: \${{ secrets.BUILD_PROVISION_PROFILE_BASE64 }}
        run: |
          CERT_PATH=\$RUNNER_TEMP/build_certificate.p12
          PP_PATH=\$RUNNER_TEMP/build_pp.mobileprovision
          KEYCHAIN_PATH=\$RUNNER_TEMP/app-signing.keychain-db
          PROFILE_PLIST=\$RUNNER_TEMP/profile.plist

          echo -n "\$BUILD_CERTIFICATE_BASE64" | base64 --decode -o "\$CERT_PATH"
          echo -n "\$BUILD_PROVISION_PROFILE_BASE64" | base64 --decode -o "\$PP_PATH"

          security cms -D -i "\$PP_PATH" > "\$PROFILE_PLIST"
          PROFILE_NAME=\$(/usr/libexec/PlistBuddy -c "Print :Name" "\$PROFILE_PLIST")
          PROFILE_UUID=\$(/usr/libexec/PlistBuddy -c "Print :UUID" "\$PROFILE_PLIST")
          TEAM_ID=\$(/usr/libexec/PlistBuddy -c "Print :TeamIdentifier:0" "\$PROFILE_PLIST")
          BUNDLE_ID=\$(/usr/libexec/PlistBuddy -c "Print :Entitlements:application-identifier" "\$PROFILE_PLIST" | sed "s/^\${TEAM_ID}\\\\.//" )

          echo "Profile Name: \$PROFILE_NAME"
          echo "Profile UUID: \$PROFILE_UUID"
          echo "Team ID: \$TEAM_ID"
          echo "Bundle ID: \$BUNDLE_ID"

          echo "TEAM_ID=\$TEAM_ID" >> "\$GITHUB_ENV"
          echo "PROFILE_NAME=\$PROFILE_NAME" >> "\$GITHUB_ENV"
          echo "BUNDLE_ID=\$BUNDLE_ID" >> "\$GITHUB_ENV"

          security create-keychain -p "\$P12_PASSWORD" "\$KEYCHAIN_PATH"
          security set-keychain-settings -lut 21600 "\$KEYCHAIN_PATH"
          security unlock-keychain -p "\$P12_PASSWORD" "\$KEYCHAIN_PATH"
          security import "\$CERT_PATH" -P "\$P12_PASSWORD" -A -t cert -f pkcs12 -k "\$KEYCHAIN_PATH"
          security set-key-partition-list -S apple-tool:,apple: -k "\$P12_PASSWORD" "\$KEYCHAIN_PATH"
          security list-keychain -d user -s "\$KEYCHAIN_PATH"
          security find-identity -v -p codesigning "\$KEYCHAIN_PATH"

          mkdir -p "\$HOME/Library/MobileDevice/Provisioning Profiles"
          cp "\$PP_PATH" "\$HOME/Library/MobileDevice/Provisioning Profiles/\$PROFILE_UUID.mobileprovision"

      - name: Apply signing to generated Runner project
        run: |
          PBXPROJ="flutter_app/ios/Runner.xcodeproj/project.pbxproj"
          if [ ! -f "\$PBXPROJ" ]; then
            echo "Runner project not found at \$PBXPROJ"
            exit 1
          fi

          python3 - <<'PY'
          from pathlib import Path
          import os
          import re

          pbxproj_path = Path("flutter_app/ios/Runner.xcodeproj/project.pbxproj")
          text = pbxproj_path.read_text()

          bundle_id = os.environ["BUNDLE_ID"]
          team_id = os.environ["TEAM_ID"]
          profile_name = os.environ["PROFILE_NAME"]

          text = text.replace("PRODUCT_BUNDLE_IDENTIFIER = com.example.flutterApp;", f"PRODUCT_BUNDLE_IDENTIFIER = {bundle_id};")
          text = re.sub(r"DEVELOPMENT_TEAM = [A-Z0-9]*;", f"DEVELOPMENT_TEAM = {team_id};", text)
          text = text.replace("CODE_SIGN_STYLE = Automatic;", "CODE_SIGN_STYLE = Manual;")
          text = re.sub(r'CODE_SIGN_IDENTITY = "Apple Development";', 'CODE_SIGN_IDENTITY = "Apple Distribution";', text)
          text = re.sub(r'PROVISIONING_PROFILE_SPECIFIER = "";', f'PROVISIONING_PROFILE_SPECIFIER = "{profile_name}";', text)

          pbxproj_path.write_text(text)
          print("Applied Runner signing patch for bundle/team/profile")
          PY

      - name: Create ExportOptions.plist
        run: |
          mkdir -p flutter_app/ios
          cat > flutter_app/ios/ExportOptions.plist << EXPORTEOF
          <?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
          <plist version="1.0">
          <dict>
            <key>method</key>
            <string>app-store-connect</string>
            <key>teamID</key>
            <string>\$TEAM_ID</string>
            <key>uploadBitcode</key>
            <false/>
            <key>uploadSymbols</key>
            <true/>
            <key>signingStyle</key>
            <string>manual</string>
            <key>provisioningProfiles</key>
            <dict>
              <key>\$BUNDLE_ID</key>
              <string>\$PROFILE_NAME</string>
            </dict>
          </dict>
          </plist>
          EXPORTEOF

      - name: Build iOS archive
        run: |
          cd flutter_app
          flutter build ipa \\
            --release \\
            --build-number="\$BUILD_NUMBER" \\
            --export-options-plist=ios/ExportOptions.plist

      - name: Upload IPA artifact
        uses: actions/upload-artifact@v4
        with:
          name: flutter-ios-ipa-\${{ github.run_id }}
          path: flutter_app/build/ios/ipa/*.ipa
          if-no-files-found: error

      - name: Upload to TestFlight
        env:
          APP_STORE_CONNECT_API_KEY_ID: \${{ secrets.APP_STORE_CONNECT_API_KEY_ID }}
          APP_STORE_CONNECT_ISSUER_ID: \${{ secrets.APP_STORE_CONNECT_ISSUER_ID }}
          APP_STORE_CONNECT_API_KEY_BASE64: \${{ secrets.APP_STORE_CONNECT_API_KEY_BASE64 }}
        run: |
          mkdir -p ~/private_keys
          echo -n "\$APP_STORE_CONNECT_API_KEY_BASE64" | base64 --decode > ~/private_keys/AuthKey_\${APP_STORE_CONNECT_API_KEY_ID}.p8
          IPA_PATH=\$(find flutter_app/build/ios/ipa -name "*.ipa" | head -1)
          echo "Uploading IPA: \$IPA_PATH"
          xcrun altool --upload-app \\
            --type ios \\
            --file "\$IPA_PATH" \\
            --apiKey "\$APP_STORE_CONNECT_API_KEY_ID" \\
            --apiIssuer "\$APP_STORE_CONNECT_ISSUER_ID"

      - name: Notify build complete
        if: always()
        run: |
          BUILD_ID="\${{ github.event.inputs.build_id || github.event.client_payload.build_id || 'n/a' }}"
          echo "Flutter iOS Build ID \$BUILD_ID finished with status \${{ job.status }}"
`,
};

function getWorkflowForPlatform(platform: string): string {
  return WORKFLOW_MAP[platform];
}

function getRepositoryDispatchEventForPlatform(platform: string): string {
  return REPOSITORY_DISPATCH_EVENT_MAP[platform];
}

const GH_EXPR = "${{";

interface BuildRequest {
  action:
    | "trigger"
    | "status"
    | "list-runs"
    | "download-artifact"
    | "fetch-logs"
    | "cancel"
    | "push-workflow";
  platform?: string;
  buildId?: string;
  runId?: number;
}

interface GitHubWorkflowRun {
  id: number;
  name?: string;
  status?: string | null;
  html_url?: string;
  created_at?: string | null;
}

async function githubAPI(
  path: string,
  token: string,
  method = "GET",
  body?: unknown,
  retries = 2,
): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    try {
      const res = await fetch(`https://api.github.com${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        const isServerError = res.status >= 500;
        if (isServerError && attempt < retries) {
          console.log(
            `GitHub API returned ${res.status}, retrying in ${
              (attempt + 1) * 2
            }s...`,
          );
          await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
        // Truncate HTML responses to avoid massive error messages
        const truncated = text.length > 300
          ? text.substring(0, 300) + "...[truncated]"
          : text;
        throw new Error(`GitHub API error [${res.status}]: ${truncated}`);
      }

      // 204 No Content for dispatch
      if (res.status === 204) return { success: true };
      return res.json();
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isTimeout = err instanceof DOMException &&
        err.name === "AbortError";
      const isNetwork = err instanceof TypeError &&
        (err as Error).message.includes("error sending request");
      if ((isTimeout || isNetwork) && attempt < retries) {
        console.log(
          `GitHub API attempt ${attempt + 1} failed, retrying in ${
            (attempt + 1) * 2
          }s...`,
        );
        await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("GitHub API: max retries exceeded");
}

async function fetchJobLogText(
  jobId: number,
  token: string,
  githubRepo: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${githubRepo}/actions/jobs/${jobId}/logs`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        redirect: "follow",
      },
    );
    if (!res.ok) return null;
    const text = await res.text();
    return text;
  } catch {
    return null;
  }
}

function extractFailedStepLogs(
  fullLog: string,
  failedStepName: string,
): string {
  const lines = fullLog.split("\n");
  let capturing = false;
  let captured: string[] = [];

  // Try to find the step's ##[group] section
  for (const line of lines) {
    if (line.includes(`##[group]${failedStepName}`)) {
      capturing = true;
      captured = [];
      continue;
    }
    if (capturing) {
      if (line.includes("##[endgroup]")) {
        capturing = false;
        continue;
      }
      captured.push(line);
    }
  }

  if (captured.length > 0) {
    return captured.slice(-150).join("\n");
  }

  // Fallback: return last 150 lines of the entire log (captures set -ex output)
  return lines.slice(-150).join("\n");
}

function sanitizeRepo(repo: string): string {
  return repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(
    /\.git$/,
    "",
  ).replace(/^\/+|\/+$/g, "");
}

function normalizeGitHubToken(
  rawToken: string | null | undefined,
): string | null {
  if (!rawToken) return null;

  let cleaned = rawToken.trim();
  cleaned = cleaned.replace(/^['"]+|['"]+$/g, "");
  cleaned = cleaned.replace(/^(?:Bearer|token)\s+/i, "");
  cleaned = cleaned.replace(/\s+/g, "");
  cleaned = cleaned.replace(/^['"]+|['"]+$/g, "");

  return cleaned || null;
}

function toErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown error";
  if (error.message.includes("GitHub API error [401]")) {
    return `${error.message} — verify that GITHUB_PAT is a valid token for ${DEFAULT_GITHUB_REPO} with Actions (read/write) and Contents (read/write), and paste only the raw token value (no Bearer/token prefix, quotes, or whitespace).`;
  }
  if (error.message.includes("GitHub API error [404]")) {
    return `${error.message} — verify the repo slug and that GITHUB_PAT has repo + workflow permissions.`;
  }
  return error.message;
}

function addWorkflowDispatchTrigger(content: string): string | null {
  if (/\bworkflow_dispatch\s*:/m.test(content)) return content;

  const onBlock = /^on:\s*\n/m;
  if (onBlock.test(content)) {
    return content.replace(onBlock, "on:\n  workflow_dispatch:\n");
  }

  const onArray = /^on:\s*\[([^\]]+)\]\s*$/m;
  if (onArray.test(content)) {
    return content.replace(onArray, (_match, eventsRaw: string) => {
      const events = eventsRaw.split(",").map((e) => e.trim()).filter(Boolean);
      const eventLines = events.map((e) => `  ${e}:`).join("\n");
      return `on:\n  workflow_dispatch:\n${eventLines}`;
    });
  }

  const onSingle = /^on:\s*([a-zA-Z_][\w-]*)\s*$/m;
  if (onSingle.test(content)) {
    return content.replace(onSingle, (_match, eventName: string) => {
      return `on:\n  workflow_dispatch:\n  ${eventName}:`;
    });
  }

  return null;
}

async function ensureWorkflowDispatchTrigger(
  githubRepo: string,
  workflowFile: string,
  ref: string,
  token: string,
): Promise<{ updated: boolean; note: string }> {
  const workflowPath = `.github/workflows/${workflowFile}`;
  const encodedPath = encodeURIComponent(workflowPath);

  const file = await githubAPI(
    `/repos/${githubRepo}/contents/${encodedPath}?ref=${
      encodeURIComponent(ref)
    }`,
    token,
  ) as { content?: string; sha?: string; encoding?: string };

  if (!file.content || !file.sha) {
    throw new Error(
      `Unable to read workflow file ${workflowPath} on branch ${ref}`,
    );
  }

  const decoded = atob(file.content.replace(/\n/g, ""));
  const patched = addWorkflowDispatchTrigger(decoded);

  if (!patched) {
    throw new Error(
      `Could not auto-patch workflow ${workflowPath}; unsupported 'on:' format`,
    );
  }

  if (patched === decoded) {
    return {
      updated: false,
      note: `${workflowPath} already has workflow_dispatch`,
    };
  }

  await githubAPI(
    `/repos/${githubRepo}/contents/${encodedPath}`,
    token,
    "PUT",
    {
      message: `fix(ci): add workflow_dispatch to ${workflowFile}`,
      content: btoa(patched),
      sha: file.sha,
      branch: ref,
    },
  );

  return {
    updated: true,
    note: `Added workflow_dispatch to ${workflowPath} on ${ref}`,
  };
}

async function upsertWorkflowFile(
  githubRepo: string,
  workflowFile: string,
  ref: string,
  content: string,
  token: string,
): Promise<void> {
  const workflowPath = `.github/workflows/${workflowFile}`;
  const encodedPath = encodeURIComponent(workflowPath);

  let existingSha: string | undefined;
  let existingContent = "";

  try {
    const file = await githubAPI(
      `/repos/${githubRepo}/contents/${encodedPath}?ref=${
        encodeURIComponent(ref)
      }`,
      token,
    ) as { content?: string; sha?: string };

    existingSha = file.sha;
    if (file.content) {
      existingContent = atob(file.content.replace(/\n/g, ""));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("GitHub API error [404]")) {
      throw error;
    }
  }

  if (existingContent === content) return;

  await githubAPI(
    `/repos/${githubRepo}/contents/${encodedPath}`,
    token,
    "PUT",
    {
      message: `chore(ci): ensure ${workflowFile} for Build Center`,
      content: btoa(content),
      ...(existingSha ? { sha: existingSha } : {}),
      branch: ref,
    },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GITHUB_PAT = normalizeGitHubToken(Deno.env.get("GITHUB_PAT"));
    if (!GITHUB_PAT) throw new Error("GITHUB_PAT is not configured");
    const githubRepo = sanitizeRepo(
      Deno.env.get("GITHUB_REPO") || DEFAULT_GITHUB_REPO,
    );

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: BuildRequest = await req.json();

    switch (body.action) {
      case "trigger": {
        const { platform } = body;
        if (!platform || !WORKFLOW_MAP[platform]) {
          throw new Error(
            `Invalid platform: ${platform}. Must be: ${
              Object.keys(WORKFLOW_MAP).join(", ")
            }`,
          );
        }

        const { data: build, error: insertError } = await supabase
          .from("builds")
          .insert({ platform, status: "provisioning" })
          .select()
          .single();
        if (insertError) {
          throw new Error(`Failed to create build: ${insertError.message}`);
        }

        const workflow = getWorkflowForPlatform(platform);
        const repoInfo = await githubAPI(
          `/repos/${githubRepo}`,
          GITHUB_PAT,
        ) as { default_branch?: string };
        const dispatchRef = repoInfo.default_branch || "main";

        try {
          // Force-push the correct Capacitor workflow YAML to ensure it's up to date
          const workflowContent = WORKFLOW_TEMPLATES[platform];
          if (workflowContent) {
            console.log(
              `Ensuring ${workflow} is up-to-date on ${dispatchRef}...`,
            );
            await upsertWorkflowFile(
              githubRepo,
              workflow,
              dispatchRef,
              workflowContent,
              GITHUB_PAT,
            );
          }

          // Robust dispatch strategy:
          // 1) Resolve workflow by path and dispatch by numeric ID when possible
          // 2) Auto-enable workflow when GitHub reports disabled state
          // 3) On 422 workflow_dispatch errors, re-patch trigger and retry with backoff
          const delays = [1500, 3000];
          const workflowPath = `.github/workflows/${workflow}`;
          let lastErr: unknown = null;

          // Small indexing grace period
          await new Promise((r) => setTimeout(r, 1000));

          for (let i = 0; i < delays.length; i++) {
            try {
              const workflowsRes = await githubAPI(
                `/repos/${githubRepo}/actions/workflows`,
                GITHUB_PAT,
              ) as {
                workflows?: Array<
                  { id: number; path?: string; state?: string }
                >;
              };

              const wf = (workflowsRes.workflows || []).find((w) =>
                w.path === workflowPath
              );
              const workflowRef = wf?.id ? String(wf.id) : workflow;

              if (wf?.state && wf.state.startsWith("disabled")) {
                console.log(
                  `Workflow ${workflowPath} is ${wf.state}; enabling...`,
                );
                await githubAPI(
                  `/repos/${githubRepo}/actions/workflows/${workflowRef}/enable`,
                  GITHUB_PAT,
                  "PUT",
                );
              }

              console.log(
                `Dispatch attempt ${i + 1} for ${workflow} via ${
                  wf?.id ? `id ${wf.id}` : "filename"
                }...`,
              );

              await githubAPI(
                `/repos/${githubRepo}/actions/workflows/${workflowRef}/dispatches`,
                GITHUB_PAT,
                "POST",
                {
                  ref: dispatchRef,
                  inputs: { build_id: build.id },
                },
                0, // no internal retries for dispatch
              );

              lastErr = null;
              break;
            } catch (err) {
              lastErr = err;
              const msg = err instanceof Error ? err.message : String(err);
              const isDispatch422 = msg.includes("GitHub API error [422]") &&
                msg.includes("workflow_dispatch");

              if (isDispatch422) {
                console.log(
                  `Dispatch attempt ${
                    i + 1
                  } got workflow_dispatch 422; re-validating workflow trigger...`,
                );
                try {
                  const patchResult = await ensureWorkflowDispatchTrigger(
                    githubRepo,
                    workflow,
                    dispatchRef,
                    GITHUB_PAT,
                  );
                  console.log(patchResult.note);
                } catch (patchErr) {
                  console.log(
                    `Trigger validation failed: ${
                      patchErr instanceof Error
                        ? patchErr.message
                        : String(patchErr)
                    }`,
                  );
                }
              } else if (
                msg.includes("GitHub API error [404]") ||
                msg.includes("GitHub API error [410]")
              ) {
                console.log(
                  `Dispatch attempt ${i + 1} got ${
                    msg.includes("[410]") ? "410" : "404"
                  }; retrying...`,
                );
              } else {
                throw err;
              }

              if (i < delays.length - 1) {
                await new Promise((r) => setTimeout(r, delays[i]));
              }
            }
          }

          if (lastErr) {
            const lastMessage = lastErr instanceof Error
              ? lastErr.message
              : String(lastErr);
            const isDispatch422 =
              lastMessage.includes("GitHub API error [422]") &&
              lastMessage.includes("workflow_dispatch");

            if (isDispatch422) {
              const eventType = getRepositoryDispatchEventForPlatform(platform);
              console.log(
                `workflow_dispatch kept failing; falling back to repository_dispatch (${eventType})...`,
              );

              await githubAPI(
                `/repos/${githubRepo}/dispatches`,
                GITHUB_PAT,
                "POST",
                {
                  event_type: eventType,
                  client_payload: {
                    build_id: build.id,
                    platform,
                    ref: dispatchRef,
                  },
                },
                0,
              );

              lastErr = null;
            }
          }

          if (lastErr) throw lastErr;
        } catch (dispatchErr) {
          const dispatchMessage = dispatchErr instanceof Error
            ? dispatchErr.message
            : "Dispatch failed";

          await supabase.from("builds").update({
            status: "failed",
            error_message: dispatchMessage,
            completed_at: new Date().toISOString(),
          }).eq("id", build.id);

          throw dispatchErr;
        }

        await supabase.from("builds").update({ status: "building" }).eq(
          "id",
          build.id,
        );

        return new Response(
          JSON.stringify({ success: true, build }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      case "status": {
        const { buildId } = body;

        if (buildId) {
          const { data: build } = await supabase.from("builds").select("*").eq(
            "id",
            buildId,
          ).single();
          return new Response(
            JSON.stringify({ success: true, build }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const { data: builds } = await supabase
          .from("builds")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        return new Response(
          JSON.stringify({ success: true, builds }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      case "list-runs": {
        const { platform } = body;
        const workflow = platform
          ? getWorkflowForPlatform(platform)
          : undefined;

        let path = `/repos/${githubRepo}/actions/runs?per_page=10`;
        if (workflow) {
          const workflows = await githubAPI(
            `/repos/${githubRepo}/actions/workflows`,
            GITHUB_PAT,
          ) as { workflows?: Array<{ id: number; path: string }> };
          const wf = workflows.workflows?.find((w: { path: string }) =>
            w.path === `.github/workflows/${workflow}`
          );
          if (wf) {
            path =
              `/repos/${githubRepo}/actions/workflows/${wf.id}/runs?per_page=10`;
          }
        }

        const runs = await githubAPI(path, GITHUB_PAT) as { workflow_runs?: unknown[] };
        return new Response(
          JSON.stringify({ success: true, runs: runs.workflow_runs }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      case "download-artifact": {
        const { runId } = body;
        if (!runId) throw new Error("runId is required for download-artifact");

        // Retry up to 3 times with 2s delay - artifacts may not be immediately available
        let artifacts: any[] = [];
        for (let attempt = 0; attempt < 3; attempt++) {
          const artifactsRes = await githubAPI(
            `/repos/${githubRepo}/actions/runs/${runId}/artifacts`,
            GITHUB_PAT,
          ) as { artifacts?: any[] };
          artifacts = artifactsRes.artifacts || [];
          if (artifacts.length > 0) break;
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 2000));
          }
        }

        if (artifacts.length === 0) {
          // Return a non-500 response so the client can retry gracefully
          return new Response(
            JSON.stringify({
              success: false,
              retryable: true,
              error:
                "Artifacts not yet available. GitHub may still be processing. Please try again in a few seconds.",
            }),
            {
              status: 202,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const artifact = artifacts.find((a: { name?: string }) =>
          /ipa|ios/i.test(a.name || "")
        ) || artifacts[0];
        const downloadRes = await fetch(
          `https://api.github.com/repos/${githubRepo}/actions/artifacts/${artifact.id}/zip`,
          {
            headers: {
              Authorization: `Bearer ${GITHUB_PAT}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
            redirect: "manual",
          },
        );

        const downloadUrl = downloadRes.headers.get("Location");
        if (!downloadUrl) {
          throw new Error("Failed to get artifact download URL");
        }

        return new Response(
          JSON.stringify({
            success: true,
            artifact: {
              name: artifact.name,
              size_in_bytes: artifact.size_in_bytes,
              download_url: downloadUrl,
              expires_at: artifact.expires_at,
            },
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      case "fetch-logs": {
        const { buildId } = body;
        if (!buildId) {
          throw new Error("buildId is required for fetch-logs");
        }

        const { data: buildRecord } = await supabase
          .from("builds")
          .select("*")
          .eq("id", buildId)
          .single();

        if (!buildRecord) {
          throw new Error("Build not found");
        }

        // Try to extract run ID from artifact_url first
        let runId: string | null = null;
        const runMatch = buildRecord.artifact_url?.match(/\/runs\/(\d+)/);
        if (runMatch) {
          runId = runMatch[1];
        }

        // If no run ID yet, try to find matching run by platform and timing
        if (!runId) {
          const workflow = getWorkflowForPlatform(buildRecord.platform);
          if (workflow) {
            const workflows = await githubAPI(
              `/repos/${githubRepo}/actions/workflows`,
              GITHUB_PAT,
            ) as { workflows?: Array<{ id: number; path: string }> };
            const wf = workflows.workflows?.find((w: { path: string }) =>
              w.path === `.github/workflows/${workflow}`
            );
            if (wf) {
              const runsRes = await githubAPI(
                `/repos/${githubRepo}/actions/workflows/${wf.id}/runs?per_page=5`,
                GITHUB_PAT,
              ) as { workflow_runs?: GitHubWorkflowRun[] };
              const runs = runsRes.workflow_runs || [];
              const buildTime = new Date(buildRecord.created_at).getTime();
              for (const r of runs) {
                if (!r.created_at) continue;
                const runTime = new Date(r.created_at).getTime();
                if (Number.isNaN(runTime)) continue;
                if (Math.abs(runTime - buildTime) < 120000) {
                  runId = String(r.id);
                  if (r.html_url) {
                    await supabase.from("builds").update({
                      artifact_url: r.html_url,
                    }).eq("id", buildId);
                  }
                  break;
                }
              }
            }
          }
        }

        // If we found a run ID, fetch job details
        if (runId) {
          const jobsRes = await githubAPI(
            `/repos/${githubRepo}/actions/runs/${runId}/jobs`,
            GITHUB_PAT,
          ) as { jobs?: any[] };

          const runRes = await githubAPI(
            `/repos/${githubRepo}/actions/runs/${runId}`,
            GITHUB_PAT,
          ) as { status?: string; conclusion?: string; html_url?: string };

          const jobs = jobsRes.jobs || [];
          const logs: Array<{
            name: string;
            status: string;
            conclusion: string | null;
            steps: Array<
              { name: string; status: string; conclusion: string | null }
            >;
            failed_step_log?: string;
          }> = [];

          for (const job of jobs) {
            const jobEntry: typeof logs[number] = {
              name: job.name,
              status: job.status,
              conclusion: job.conclusion,
              steps: (job.steps || []).map((
                s: { name: string; status: string; conclusion: string | null },
              ) => ({
                name: s.name,
                status: s.status,
                conclusion: s.conclusion,
              })),
            };

            // If the job has failed steps, fetch the actual log text (skip non-critical steps)
            const NON_CRITICAL = [
              "Notify build complete",
              "Post Checkout",
              "Post Setup Flutter",
              "Complete job",
            ];
            if (job.conclusion === "failure" || job.status === "completed") {
              const failedStep = (job.steps || []).find(
                (s: { name: string; conclusion: string | null }) =>
                  s.conclusion === "failure" &&
                  !NON_CRITICAL.some((nc) =>
                    s.name.includes(nc)
                  ),
              );
              if (failedStep) {
                const fullLog = await fetchJobLogText(
                  job.id,
                  GITHUB_PAT,
                  githubRepo,
                );
                if (fullLog) {
                  jobEntry.failed_step_log = extractFailedStepLogs(
                    fullLog,
                    failedStep.name,
                  );
                }
              }
            }

            logs.push(jobEntry);
          }

          // Update build status based on GitHub run status
          const ghStatus = runRes.status;
          const ghConclusion = runRes.conclusion;
          let dbStatus = buildRecord.status;
          if (ghStatus === "completed") {
            // Check if failure was only in non-critical steps (e.g. "Notify build complete")
            const NON_CRITICAL_STEPS = [
              "Notify build complete",
              "Post Checkout",
              "Post Setup Flutter",
              "Complete job",
            ];
            let artifactUploaded = false;
            let onlyNonCriticalFailed = true;

            for (const job of jobs) {
              const steps = job.steps || [];
              for (const s of steps) {
                const sAny = s as Record<string, unknown>;
                const stepName = String(sAny.name || "");
                const stepConclusion = sAny.conclusion as string | null;
                if (
                  stepName.toLowerCase().includes("upload") &&
                  stepConclusion === "success"
                ) {
                  artifactUploaded = true;
                }
                if (stepConclusion === "failure") {
                  const isNonCritical = NON_CRITICAL_STEPS.some((nc) =>
                    stepName.includes(nc)
                  );
                  if (!isNonCritical) {
                    onlyNonCriticalFailed = false;
                  }
                }
              }
            }

            console.log(
              `Build eval: artifactUploaded=${artifactUploaded}, onlyNonCriticalFailed=${onlyNonCriticalFailed}, ghConclusion=${ghConclusion}`,
            );

            // If artifacts uploaded and only non-critical steps failed, treat as success
            if (
              ghConclusion === "failure" && artifactUploaded &&
              onlyNonCriticalFailed
            ) {
              dbStatus = "completed";
            } else {
              dbStatus = ghConclusion === "success" ? "completed" : "failed";
            }

            const updateData: Record<string, unknown> = {
              status: dbStatus,
              completed_at: new Date().toISOString(),
              artifact_url: runRes.html_url,
            };
            if (dbStatus === "failed") {
              updateData.error_message = `GitHub Actions: ${ghConclusion}`;
              // Store the failed step log in build_log for persistence
              const failedJobLog = logs.find((j) => j.failed_step_log)
                ?.failed_step_log;
              if (failedJobLog) {
                updateData.build_log = failedJobLog;
              }
            } else {
              // Clear any previous error
              updateData.error_message = null;
            }
            await supabase.from("builds").update(updateData).eq("id", buildId);
          } else if (
            ghStatus === "in_progress" && buildRecord.status !== "building"
          ) {
            await supabase.from("builds").update({ status: "building" }).eq(
              "id",
              buildId,
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              run_id: runId,
              run_url: runRes.html_url,
              status: ghStatus,
              conclusion: ghConclusion,
              jobs: logs,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Still no run found
        const runsRes = await githubAPI(
          `/repos/${githubRepo}/actions/runs?per_page=5`,
          GITHUB_PAT,
        ) as { workflow_runs?: GitHubWorkflowRun[] };
        const recentRuns = runsRes.workflow_runs || [];

        return new Response(
          JSON.stringify({
            success: true,
            run_id: null,
            status: buildRecord.status,
            conclusion: null,
            message: "Waiting for GitHub Actions to start the workflow...",
            recent_runs: recentRuns.map((r) => ({
              id: r.id,
              name: r.name || "",
              status: r.status || "",
              url: r.html_url || "",
            })),
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      case "cancel": {
        const { buildId } = body;
        if (!buildId) throw new Error("buildId is required");

        const { data: buildRecord } = await supabase
          .from("builds")
          .select("*")
          .eq("id", buildId)
          .single();
        if (!buildRecord) throw new Error("Build not found");

        // Try to cancel the GitHub Actions run if we have an artifact_url with a run ID
        if (buildRecord.artifact_url) {
          const runMatch = buildRecord.artifact_url.match(/\/runs\/(\d+)/);
          if (runMatch) {
            try {
              await githubAPI(
                `/repos/${githubRepo}/actions/runs/${runMatch[1]}/cancel`,
                GITHUB_PAT,
                "POST",
              );
            } catch {
              // Ignore - run may already be finished
            }
          }
        }

        // Mark as failed/cancelled in database
        await supabase
          .from("builds")
          .update({
            status: "failed",
            error_message: "Cancelled by user",
            completed_at: new Date().toISOString(),
          })
          .eq("id", buildId);

        return new Response(
          JSON.stringify({ success: true }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      case "push-workflow": {
        const { platform } = body;
        if (!platform) {
          throw new Error("platform is required for push-workflow");
        }
        if (!WORKFLOW_MAP[platform]) {
          throw new Error(`No workflow for platform: ${platform}`);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message:
              `Workflows are managed in the repo at .github/workflows/. Push changes via git.`,
            workflow: WORKFLOW_MAP[platform],
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      default:
        throw new Error(`Unknown action: ${body.action}`);
    }
  } catch (error: unknown) {
    console.error("GitHub build error:", error);
    const msg = toErrorMessage(error);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      {
        status: msg.includes("GitHub API error [401]") ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
