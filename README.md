# Git Peel

A Visual Studio Code extension that allows you to browse and restore files to previous git commits directly from the editor.

## Features

Git Peel provides a quick way to explore the commit history of the currently active file and restore it to any previous state.

### Key Features:

- **Quick Commit History**: Browse all commits that affected the current file
- **Live Preview**: Preview file content at any commit without leaving your editor
- **One-Click Restore**: Restore the file to any previous commit with confirmation
- **Smart Integration**: Works seamlessly with your existing git workflow

### How it Works:

1. Open any file in your git repository
2. Run the "Show Git History (Git Peel)" command (or use the command palette)
3. Browse through the commit history with commit messages and dates
4. Preview file content at any commit by selecting it
5. Restore to any commit with a single click and confirmation

## Requirements

- Visual Studio Code
- A git repository with the file you want to explore
- Git must be installed and accessible from the command line

## Usage

### Command Palette

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Git Peel" or "Show Git History"
3. Select "Show Git History (Git Peel)"

### Keyboard Shortcut

You can assign a custom keyboard shortcut to the `git-peel.showHistory` command in your VS Code keybindings.

## Extension Settings

This extension does not currently add any VS Code settings.

## Known Issues

- Currently only works with files that have been tracked by git
- Large commit histories may take a moment to load
- File restoration is permanent - make sure to confirm before restoring

## Release Notes

### 0.0.1

- Initial release of Git Peel
- Basic commit history browsing
- File preview functionality
- One-click restore with confirmation

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This extension is licensed under the MIT License.

**Enjoy!**