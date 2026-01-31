import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../utils/bip39_wordlist.dart';

/// Get BIP39 wordlist for autocomplete
List<String> get bip39Wordlist {
  // BIP39 English wordlist (2048 words)
  return bip39EnglishWordlist;
}

/// Check if a word is valid BIP39 word
bool isValidBip39Word(String word) {
  return bip39Wordlist.contains(word.toLowerCase().trim());
}

/// Get autocomplete suggestions for a partial word
List<String> getWordSuggestions(String partial, {int limit = 6}) {
  final lower = partial.toLowerCase().trim();
  if (lower.isEmpty) return [];
  return bip39Wordlist
      .where((word) => word.startsWith(lower))
      .take(limit)
      .toList();
}

class SeedWordInput extends StatefulWidget {
  final int index;
  final String value;
  final ValueChanged<String> onChanged;
  final VoidCallback? onMoveToNext;
  final VoidCallback? onMoveToPrevious;
  final bool autoFocus;

  const SeedWordInput({
    super.key,
    required this.index,
    required this.value,
    required this.onChanged,
    this.onMoveToNext,
    this.onMoveToPrevious,
    this.autoFocus = false,
  });

  @override
  State<SeedWordInput> createState() => _SeedWordInputState();
}

class _SeedWordInputState extends State<SeedWordInput> {
  late TextEditingController _controller;
  late FocusNode _focusNode;
  List<String> _suggestions = [];
  int _selectedSuggestionIndex = 0;
  bool _isFocused = false;
  OverlayEntry? _overlayEntry;
  final LayerLink _layerLink = LayerLink();

  bool get _isValid => widget.value.isNotEmpty && isValidBip39Word(widget.value);
  bool get _isInvalid => widget.value.isNotEmpty && !isValidBip39Word(widget.value);
  bool get _showSuggestions => _isFocused && _suggestions.isNotEmpty && widget.value.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value);
    _focusNode = FocusNode();
    _focusNode.addListener(_onFocusChange);
    
    if (widget.autoFocus) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _focusNode.requestFocus();
      });
    }
  }

  @override
  void didUpdateWidget(SeedWordInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value && _controller.text != widget.value) {
      _controller.text = widget.value;
      _controller.selection = TextSelection.fromPosition(
        TextPosition(offset: widget.value.length),
      );
    }
  }

  @override
  void dispose() {
    _hideOverlay();
    _controller.dispose();
    _focusNode.removeListener(_onFocusChange);
    _focusNode.dispose();
    super.dispose();
  }

  void _onFocusChange() {
    setState(() {
      _isFocused = _focusNode.hasFocus;
    });
    
    if (_isFocused && _showSuggestions) {
      _showOverlay();
    } else {
      // Delay hiding to allow click on suggestion
      Future.delayed(const Duration(milliseconds: 150), () {
        if (!_focusNode.hasFocus) {
          _hideOverlay();
        }
      });
    }
  }

  void _updateSuggestions(String value) {
    final newSuggestions = getWordSuggestions(value);
    setState(() {
      _suggestions = newSuggestions;
      _selectedSuggestionIndex = 0;
    });
    
    if (_showSuggestions) {
      _showOverlay();
    } else {
      _hideOverlay();
    }
  }

  void _showOverlay() {
    _hideOverlay();
    if (!_showSuggestions) return;

    _overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        width: 120,
        child: CompositedTransformFollower(
          link: _layerLink,
          offset: const Offset(0, 44),
          showWhenUnlinked: false,
          child: Material(
            elevation: 8,
            borderRadius: BorderRadius.circular(8),
            color: AppTheme.card,
            child: Container(
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.border),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: _suggestions.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final suggestion = entry.value;
                  return InkWell(
                    onTap: () => _selectSuggestion(suggestion),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: idx == _selectedSuggestionIndex 
                            ? AppTheme.secondary 
                            : Colors.transparent,
                        borderRadius: idx == 0
                            ? const BorderRadius.vertical(top: Radius.circular(7))
                            : idx == _suggestions.length - 1
                                ? const BorderRadius.vertical(bottom: Radius.circular(7))
                                : null,
                      ),
                      child: RichText(
                        text: TextSpan(
                          children: [
                            TextSpan(
                              text: widget.value,
                              style: const TextStyle(
                                fontSize: 13,
                                fontFamily: 'monospace',
                                color: AppTheme.primary,
                              ),
                            ),
                            TextSpan(
                              text: suggestion.substring(widget.value.length),
                              style: const TextStyle(
                                fontSize: 13,
                                fontFamily: 'monospace',
                                color: AppTheme.foreground,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ),
      ),
    );

    Overlay.of(context).insert(_overlayEntry!);
  }

  void _hideOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  void _selectSuggestion(String suggestion) {
    widget.onChanged(suggestion);
    _controller.text = suggestion;
    _hideOverlay();
    setState(() {
      _suggestions = [];
    });
    widget.onMoveToNext?.call();
  }

  void _handleTextChange(String value) {
    final cleaned = value.toLowerCase().replaceAll(RegExp(r'[^a-z]'), '');
    widget.onChanged(cleaned);
    _updateSuggestions(cleaned);
  }

  KeyEventResult _handleKeyEvent(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;

    if (_showSuggestions) {
      if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
        setState(() {
          _selectedSuggestionIndex = 
              (_selectedSuggestionIndex + 1) % _suggestions.length;
        });
        _showOverlay();
        return KeyEventResult.handled;
      }
      
      if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
        setState(() {
          _selectedSuggestionIndex = 
              (_selectedSuggestionIndex - 1 + _suggestions.length) % _suggestions.length;
        });
        _showOverlay();
        return KeyEventResult.handled;
      }
      
      if (event.logicalKey == LogicalKeyboardKey.enter ||
          event.logicalKey == LogicalKeyboardKey.tab) {
        if (_suggestions.isNotEmpty) {
          _selectSuggestion(_suggestions[_selectedSuggestionIndex]);
          return KeyEventResult.handled;
        }
      }
    }

    // Handle space to move to next
    if (event.logicalKey == LogicalKeyboardKey.space) {
      widget.onMoveToNext?.call();
      return KeyEventResult.handled;
    }

    // Handle backspace on empty field
    if (event.logicalKey == LogicalKeyboardKey.backspace && 
        widget.value.isEmpty) {
      widget.onMoveToPrevious?.call();
      return KeyEventResult.handled;
    }

    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    // Determine border color based on validation state (not focus)
    Color borderColor;
    if (_isValid) {
      borderColor = AppTheme.primary.withOpacity(0.5);
    } else if (_isInvalid) {
      borderColor = AppTheme.destructive.withOpacity(0.5);
    } else {
      borderColor = AppTheme.border;
    }

    return CompositedTransformTarget(
      link: _layerLink,
      child: Focus(
        onKeyEvent: _handleKeyEvent,
        child: Container(
          decoration: BoxDecoration(
            color: AppTheme.card,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: borderColor,
              width: 1,
            ),
          ),
          child: Row(
            children: [
              // Index number
              Container(
                width: 28,
                alignment: Alignment.center,
                child: Text(
                  '${widget.index + 1}.',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.mutedForeground,
                  ),
                ),
              ),
              // Text input with focus border
              Expanded(
                child: TextField(
                  controller: _controller,
                  focusNode: _focusNode,
                  autocorrect: false,
                  enableSuggestions: false,
                  textCapitalization: TextCapitalization.none,
                  style: const TextStyle(
                    fontSize: 13,
                    fontFamily: 'monospace',
                    color: AppTheme.foreground,
                  ),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 4, vertical: 10),
                    isDense: true,
                    hintText: 'word',
                    hintStyle: TextStyle(
                      fontSize: 13,
                      fontFamily: 'monospace',
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                  onChanged: _handleTextChange,
                  onSubmitted: (_) => widget.onMoveToNext?.call(),
                ),
              ),
              const SizedBox(width: 2),
              // Validation icon
              if (_isValid)
                const Padding(
                  padding: EdgeInsets.only(right: 8),
                  child: Icon(
                    Icons.check,
                    size: 14,
                    color: AppTheme.success,
                  ),
                ),
              if (_isInvalid)
                const Padding(
                  padding: EdgeInsets.only(right: 8),
                  child: Icon(
                    Icons.close,
                    size: 14,
                    color: AppTheme.destructive,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
