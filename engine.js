'format cjs';

var wrap = require('word-wrap');
var map = require('lodash.map');
var longest = require('longest');
var rightPad = require('right-pad');
var chalk = require('chalk');

var filter = function(array) {
  return array.filter(function(x) {
    return x;
  });
};

var headerLength = function(answers) {
  return (
    answers.type.length + 2 + (answers.scope ? answers.scope.length + 2 : 0)
  );
};

var maxSummaryLength = function(options, answers) {
  return options.maxHeaderWidth - headerLength(answers);
};

var filterSubject = function(subject) {
  subject = subject.trim();
  if (subject.charAt(0).toLowerCase() !== subject.charAt(0)) {
    subject =
      subject.charAt(0).toLowerCase() + subject.slice(1, subject.length);
  }
  while (subject.endsWith('.')) {
    subject = subject.slice(0, subject.length - 1);
  }
  return subject;
};

var JiraIdReg = /^[A-Z]{1,10}-\d+$/;

// This can be any kind of SystemJS compatible module.
// We use Commonjs here, but ES6 or AMD would do just
// fine.
module.exports = function(options) {
  var types = options.types;

  var length = longest(Object.keys(types)).length + 1;
  var choices = map(types, function(type, key) {
    return {
      name: rightPad(key + ':', length) + ' ' + type.description,
      value: key
    };
  });

  return {
    // When a user runs `git cz`, prompter will
    // be executed. We pass you cz, which currently
    // is just an instance of inquirer.js. Using
    // this you can ask questions and get answers.
    //
    // The commit callback should be executed when
    // you're ready to send back a commit template
    // to git.
    //
    // By default, we'll de-indent your commit
    // template and will keep empty lines.
    prompter: function(cz, commit) {
      // Let's ask some questions of the user
      // so that we can populate our commit
      // template.
      //
      // See inquirer.js docs for specifics.
      // You can also opt to use another input
      // collection library if you prefer.
      cz.prompt([
        {
          type: 'input',
          name: 'issues',
          message: '添加Jira-id:\n',
          validate: function(issues) {
            return JiraIdReg.test(issues)
              ? true
              : '请添加格式如 FXX-323 的jira id,不要添加 # 号';
          }
        },
        {
          type: 'list',
          name: 'type',
          message: '请选择commit类型:',
          choices: choices,
          default: options.defaultType
        },
        {
          type: 'input',
          name: 'scope',
          message:
            '请选择提交的影响范围 (如 component 、 file name): (确认以跳过)',
          default: options.defaultScope,
          filter: function(value) {
            return value.trim().toLowerCase();
          }
        },
        {
          type: 'input',
          name: 'subject',
          message: function(answers) {
            return (
              '请填写一个简短、声明式的主题描述 (不超过 ' +
              maxSummaryLength(options, answers) +
              ' 字符):\n'
            );
          },
          default: options.defaultSubject,
          validate: function(subject, answers) {
            var filteredSubject = filterSubject(subject);
            return filteredSubject.length == 0
              ? '主题为必须字段'
              : filteredSubject.length <= maxSummaryLength(options, answers)
              ? true
              : '主题的长度应不大于 ' +
                maxSummaryLength(options, answers) +
                ' 字符. 当前为 ' +
                filteredSubject.length +
                ' 字符.';
          },
          transformer: function(subject, answers) {
            var filteredSubject = filterSubject(subject);
            var color =
              filteredSubject.length <= maxSummaryLength(options, answers)
                ? chalk.green
                : chalk.red;
            return color('(' + filteredSubject.length + ') ' + subject);
          },
          filter: function(subject) {
            return filterSubject(subject);
          }
        },
        {
          type: 'input',
          name: 'body',
          message: '请填写详细的提交描述: (确认以跳过)\n',
          default: options.defaultBody
        }
        // {
        //   type: 'confirm',
        //   name: 'isBreaking',
        //   message: 'Are there any breaking changes?',
        //   default: false
        // },
        // {
        //   type: 'input',
        //   name: 'breakingBody',
        //   default: '-',
        //   message:
        //     'A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself:\n',
        //   when: function(answers) {
        //     return answers.isBreaking && !answers.body;
        //   },
        //   validate: function(breakingBody, answers) {
        //     return (
        //       breakingBody.trim().length > 0 ||
        //       'Body is required for BREAKING CHANGE'
        //     );
        //   }
        // },
        // {
        //   type: 'input',
        //   name: 'breaking',
        //   message: 'Describe the breaking changes:\n',
        //   when: function(answers) {
        //     return answers.isBreaking;
        //   }
        // },
      ]).then(function(answers) {
        var wrapOptions = {
          trim: true,
          cut: false,
          newline: '\n',
          indent: '',
          width: options.maxLineWidth
        };

        // parentheses are only needed when a scope is present
        var scope = answers.scope ? '(' + answers.scope + ')' : '';

        // Hard limit this line in the validate
        var head =
          answers.type +
          scope +
          ': #' +
          answers.issues +
          '# ' +
          answers.subject;

        // Wrap these lines at options.maxLineWidth characters
        var body = answers.body ? wrap(answers.body, wrapOptions) : false;

        // Apply breaking change prefix, removing it if already present
        // var breaking = answers.breaking ? answers.breaking.trim() : '';
        // breaking = breaking
        //   ? 'BREAKING CHANGE: ' + breaking.replace(/^BREAKING CHANGE: /, '')
        //   : '';
        // breaking = breaking ? wrap(breaking, wrapOptions) : false;

        commit(filter([head, body]).join('\n\n'));
      });
    }
  };
};
