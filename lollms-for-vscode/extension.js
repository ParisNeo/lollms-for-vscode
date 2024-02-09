const vscode = require('vscode');
const axios = require('axios');

const host = 'localhost';
const port = 9600 ;
/**
 * Activates the extension when VSCode starts.
 * @param {vscode.ExtensionContext} context - The context of the extension.
 */
function activate(context) {
  console.log('lollms VSCode extension is now active!');

  // Register the command to generate code from comment
  let generateCodeFromCommentCommand = vscode.commands.registerCommand('extension.generateCodeFromComment', async () => {
    // Get the current comment text
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const position = editor.selection.active;
      const commentRange = getCommentRange(editor.document, position);
      if (commentRange) {
        const commentText = editor.document.getText(commentRange).replace('/**', '').replace('*/', '').trim();

        // Make a POST request to the lollms server
        try {
          const response = await axios.post(`http://${host}:${port}/lollms_generate`, {
            prompt: commentText
          });
          const generatedCode = response.data;

          // Show the generated code as suggestions to the user
          const items = [
            {
              label: generatedCode,
              detail: 'Accept this suggestion',
              picked: true
            },
            {
              label: 'Regenerate',
              detail: 'Generate a new suggestion',
              picked: false
            },
            {
              label: 'Cancel',
              detail: 'Cancel code generation',
              picked: false
            }
          ];
          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a suggestion',
            ignoreFocusOut: true
          });

          if (selected) {
            if (selected.label === generatedCode) {
              // User accepted the suggestion, insert the generated code
              editor.edit(editBuilder => {
                editBuilder.replace(commentRange, generatedCode);
              });
            } else if (selected.label === 'Regenerate') {
              // User wants to regenerate a new suggestion
              vscode.commands.executeCommand('extension.generateCodeFromComment');
            }
          }
        } catch (error) {
          vscode.window.showErrorMessage('Failed to generate code from comment. Please try again.');
        }
      } else {
        vscode.window.showInformationMessage('No comment found at the current cursor position.');
      }
    } else {
      vscode.window.showInformationMessage('No active text editor found.');
    }
  });

  // Register the command
  context.subscriptions.push(generateCodeFromCommentCommand);

  // Register the keyboard shortcut
  context.subscriptions.push(vscode.commands.registerCommand('extension.generateCodeFromCommentShortcut', () => {
    vscode.commands.executeCommand('extension.generateCodeFromComment');
  }));
}

/**
 * Deactivates the extension when VSCode is closed.
 */
function deactivate() {
  console.log('lollms VSCode extension is now deactivated!');
}

/**
 * Returns the range of the comment at the specified position.
 * @param {vscode.TextDocument} document - The document containing the comment.
 * @param {vscode.Position} position - The position within the document.
 * @returns {vscode.Range|null} - The range of the comment, or null if not found.
 */
function getCommentRange(document, position) {
  const line = document.lineAt(position.line);
  const text = line.text;

  // Check for JavaScript comments
  const jsCommentStart = text.indexOf('/*');
  const jsCommentEnd = text.indexOf('*/');
  if (jsCommentStart !== -1 && jsCommentEnd !== -1 && jsCommentStart < position.character && position.character < jsCommentEnd) {
    return new vscode.Range(position.line, jsCommentStart, position.line, jsCommentEnd + 2);
  }

  // Check for Python comments
  const pyCommentStart = text.indexOf('#');
  if (pyCommentStart !== -1 && pyCommentStart < position.character) {
    return new vscode.Range(position.line, pyCommentStart, position.line, text.length);
  }

  return null;
}


module.exports = {
  activate,
  deactivate
};
