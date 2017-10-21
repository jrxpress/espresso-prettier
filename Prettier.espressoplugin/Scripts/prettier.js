#!/usr/bin/env node

var yargs = require('../ScriptLibraries/node_modules/yargs');
var prettier = require('../ScriptLibraries/node_modules/prettier');
var spawn = require('child_process').spawn;
var fs = require('fs');

var argv = yargs
	.option('input', {
		alias: 'i',
		describe: 'The string of Javascript to comb',
		type: 'string'
	})
	.option('processFile', {
		alias: 'f',
		describe: 'Process entire editorPath file',
		default: 'false',
		type: 'boolean'
	})
	.option('config', {
		alias: 'c',
		describe: 'A custom configuration object',
		type: 'string'
	})
	.option('tabWidth', {
		alias: 't',
		describe: 'Specify the number of spaces per indentation-level',
		type: 'number'
	})
	.option('useTabs', {
		alias: 'u',
		describe: 'Indent lines with tabs instead of spaces',
		type: 'boolean'
	})
	.option('editorPath', {
		alias: 'p',
		describe: 'The absolute path to the current file',
		type: 'string'
	})
	.option('editorDirectoryPath', {
		alias: 'd',
		describe: 'The absolute path to the current file\'s parent directory',
		type: 'string'
	})
	.option('editorProjectPath', {
		alias: 'r',
		describe: 'The absolute path to the project root directory',
		type: 'string'
	})
	.help('h')
	.alias('v', 'version')
	.alias('h', 'help')
	.argv;

var selection = argv.input || process.env.EDITOR_SELECTION;
var useTabs = argv.useTabs || process.env.TM_SOFT_TABS === 'YES' ? false : true;
var tabWidth = argv.tabWidth || parseInt(process.env.TM_TAB_SIZE, 10) || 3;

// The absolute path to the file
var editorPath = argv.editorPath || process.env.EDITOR_PATH;

// The absolute path to the file's parent directory
var editorDirectoryPath = argv.editorDirectoryPath || process.env.EDITOR_DIRECTORY_PATH;

// The absolute path to the file's parent directory
var editorProjectPath = argv.editorProjectPath || process.env.EDITOR_PROJECT_PATH;

// Get configuration settings primarily from custom config file, secondarily from default config:
function getConfig() {
	var config = {};

	config = argv.config || prettier.resolveConfig.sync(editorPath);

	if (config === null) {
		config = getDefaultConfig();
	}
	
	return config;
}

// Default configuration with 'zen' ordering and Espresso style markup:
function getDefaultConfig() {
	var config = {};
	
	// Add configuration that mimics most of the settings from Espresso:
	config.printWidth         = 80;
	config.tabWidth           = tabWidth;
	config.useTabs            = useTabs;
	config.semi               = true;
	config.singleQuote        = true;
	config.trailingComma      = 'none';
	config.bracketSpacing     = true;
	config.jsxBracketSameLine = false;
	config.filepath           = editorPath;
	config.requirePragma      = false;
	
	return config;
}

// Apply configuration:
var config = getConfig();

// Make sure it knows where to look to parse file
config.filepath = editorPath;

if (argv.processFile) {
	fs.readFile(editorPath, { encoding: 'utf8' }, function(err, data) {
		if (err && err.path) {
			errorDialog('Error: no such file or directory\n\n' + err.path);
			return;
		} else if (err) {
			errorDialog(err);
			return;
		}
		formatCode(data);
	});
} else {
	formatCode(selection);
}

function formatCode(string) {
	var formatted = '';
	try {
		formatted = prettier.format(string, config);
		console.log(formatted);
	}
	catch (err) {
		if (err.message) {
			errorDialog(err.message);
		} else {
			errorDialog(JSON.stringify(err, undefined, 2));
		}
		console.log(string);
	}
}

function escapeForShell(message) {
	return message.replace(/"/g, '\\"').replace(/ /g, ' ');
}

function errorDialog(err) {
	var osascript = spawn(
		'osascript',
		['-e', "tell application \"Espresso\" to display dialog \"" + escapeForShell(err) + "\" buttons \"OK\" default button 1 with title \"Prettier\" with icon caution"],
		{
			detached: true,
			stdio: 'ignore'
		}
	);

	osascript.unref();
}