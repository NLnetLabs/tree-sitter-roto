/**
 * @file A statically-typed, compiled, embedded scripting language for Rust
 * @author NLnet Labs <routing-team@nlnetlabs.nl>
 * @license BSD-3-Clause
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "roto",

  extras: $ => [
    /\s/,
    $.line_comment
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    [$._expression, $.typed_record_expression],
  ],

  rules: {
    source_file: $ => repeat($._declaration),

    identifier: _ => /(r#)?[_\p{XID_Start}][_\p{XID_Continue}]*/,

    line_comment: $ => seq(
      '#',
      token.immediate(prec(1, /.*/)),
    ),
    
    _declaration: $ => choice(
      $.filtermap_item,
      $.function_item,
      $.record_item,
      $.test_item,
      $.import,
    ),

    import: $ => seq(
      'import',
      $.import_path,
      ';',
    ),

    import_path: $ => seq(
      $._import_path_part,
      repeat(seq('.', $._import_path_part)),
    ),

    _import_path_part: $ => choice(
      $.identifier,
      $.import_path_group,
    ),

    import_path_group: $ => 
      seq('{', trailingCommaSep($.import_path) ,'}'),

    parameter_list: $ => seq(
      '(',
      trailingCommaSep($.parameter),
      ')',
    ),

    parameter: $ => seq(
      $.identifier,
      ':',
      $._type,
    ),

    filtermap_item: $ => seq(
      choice('filtermap', 'filter'),
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      field('body', $.block),
    ),

    function_item: $ => seq(
      'fn',
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional(seq('->', field("return_type", $._type))),
      field('body', $.block),
    ),

    test_item: $ => seq(
      'test',
      field('name', $.identifier),
      field('body', $.block),
    ),

    record_item: $ => seq(
      'type',
      field('name', $.identifier),
      field('fields', $.record_type),
    ),

    block: $ => prec(2, seq(
      '{',
      repeat($._statement),
      optional($._expression),
      '}',
    )),

    _statement: $ => choice(
      $.import,
      prec(1, $.if_else_expression),
      prec(1, $.match_expression),
      prec(1, $.while_expression),
      $.let_statement,
      seq($._expression, ';'),
    ),

    let_statement: $ => seq(
      'let',
      field('variable', $.identifier),
      optional(seq(
        ':',
        field('type', $._type),
      )),
      '=',
      field('value', $._expression),
      ';'
    ),

    path: $ => prec(10, choice(
      $.identifier,
      seq($.path, '.', $.identifier),
    )),

    _expression: $ => choice(
      $.return_expression,
      $._literal,
      $.match_expression,
      $.call_expression,
      $.path,
      $.access_expression,
      $.record_expression,
      $.typed_record_expression,
      // $.list_expr,
      $.negation_expression,
      $.not_expression,
      $.binary_expression,
      $.if_else_expression,
      $.while_expression,
      $.parentheses_expression,
      $.question_expression,
    ),

    question_expression: $ => seq(
      $._expression,
      '?',
    ),

    return_expression: $ => prec.left(seq(
      choice('return', 'accept', 'reject'),
      optional($._expression),
    )),

    negation_expression: $ => prec.left(3, seq(
      '-',
      $._expression,
    )),

    not_expression: $ => prec(5, seq(
      'not',
      $._expression,
    )),

    binary_expression: $ => {
      const table = [
        [1, choice('&&', '||')],
        [2, choice('==', '!=', '<', '<=', '>', '>=')],
        [3, choice('+', '-')],
        [4, choice('*', '/')],
      ];

      return choice(...table.map(([precedence, operator]) => prec.left(precedence, seq(
        field('left', $._expression),
        field('operator', operator),
        field('right', $._expression),
      ))));
    },

    if_else_expression: $ => prec.right(seq(
      'if',
      field('condition', $._expression),
      field('consequence', $.block),
      optional(field('alternative', seq('else', choice($.block, $.if_else_expression)))),
    )),

    while_expression: $ => seq(
      'while',
      field('condition', $._expression),
      field('body', $.block),
    ),

    match_expression: $ => seq(
      'match',
      field('value', $._expression),
      field('body', $.match_block),
    ),

    match_block: $ => seq(
      '{',
      optional(seq(
        repeat($.match_arm),
        alias($.last_match_arm, $.match_arm),
      )),
      '}',
    ),

    match_arm: $ => seq(
      field('pattern', $.pattern),
      optional(seq('|', $._expression)),
      '->',
      field('value', choice(
        seq($.block, optional(',')),
        seq($._expression, ','),
      )),
    ),

    last_match_arm: $ => seq(
      field('pattern', $.pattern),
      optional(seq('|', $._expression)),
      '->',
      field('value', choice(
        seq($.block, optional(',')),
        seq($._expression, optional(',')),
      )),
    ),

    pattern: $ => seq(
      $.path,
      optional($.pattern_arguments),
    ),

    pattern_arguments: $ => seq(
      '(',
      trailingCommaSep($.identifier),
      ')',
    ),

    access_expression: $ => prec(7, seq($._expression, '.', $.identifier)),

    call_expression: $ => prec(6, seq(
      field("function", $._expression),
      '(',
      trailingCommaSep($._expression),
      ')',
    )),

    parentheses_expression: $ => seq('(', $._expression, ')'),

    typed_record_expression: $ => seq($.path, $.record_expression),
    
    record_expression: $ => seq(
      '{',
      trailingCommaSep($.record_field),
      '}',
    ),

    record_field: $ => seq(
      $.identifier,
      ':',
      $._expression,
    ),

    _literal: $ => choice(
      $.unit_literal,
      $.boolean_literal,
      $.integer_literal,
      $.ipv4_literal,
      // $.ipv6_literal,
      $.string_literal,
    ),

    unit_literal: _ => seq('(', ')'),

    boolean_literal: _ => choice('true', 'false'),

    integer_literal: _ => /[0-9][0-9_]*/,

    ipv4_literal: _ => /[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*/,

    string_literal: $ => token(seq(
      '"',
      /[^\"]*/,
      '"',
    )),
    
    _type: $ => choice(
      $.optional_type,
      $.type_name,
      $.never,
      $.unit,
      $.record_type,
    ),

    type_name: $ => seq(
      $.path,
      optional(seq(
        '[',
        trailingCommaSep($._type),
        ']',
      ))
    ),

    optional_type: $ => seq($._type, '?'),

    never: $ => '!',
    unit: _ => token(seq('(', ')')),
    
    record_type: $ => seq(
      '{',
      trailingCommaSep($.record_type_field),
      '}',
    ),

    record_type_field: $ => seq(
      $.identifier,
      ':',
      $._type,
    ),
  }
});

function trailingCommaSep(rule) {
  return seq(commaSep(rule), optional(','));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

function commaSep(rule) {
  return optional(commaSep1(rule));
}
