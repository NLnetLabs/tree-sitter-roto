; Identifiers

(optional_type) @type
(type_name) @type
(unit) @type
(never) @type
(record_type) @type

; Identifier conventions

; Assume all-caps names are constants
((identifier) @constant
 (#match? @constant "^[A-Z][A-Z\\d_]+$'"))

; Assume that uppercase names in paths are types
((identifier) @type
 (#match? @type "^[A-Z]"))

; Function definitions

(function_item (identifier) @function)
(filtermap_item (identifier) @function)
(test_item (identifier) @function)

(line_comment) @comment

"(" @punctuation.bracket
")" @punctuation.bracket
"{" @punctuation.bracket
"}" @punctuation.bracket
"<" @punctuation.bracket
">" @punctuation.bracket

":" @punctuation.delimiter
"." @punctuation.delimiter
"," @punctuation.delimiter
";" @punctuation.delimiter

(parameter (identifier) @variable.parameter)

"accept" @keyword
; "dep" @keyword
"else" @keyword
"filter" @keyword
"filtermap" @keyword
"fn" @keyword
"if" @keyword
"import" @keyword
; "in" @keyword
"let" @keyword
; "match" @keyword
"not" @keyword
; "pkg" @keyword
"reject" @keyword
"return" @keyword
; "std" @keyword
; "super" @keyword
"test" @keyword
"type" @keyword

(string_literal) @string

(unit_literal) @constant.builtin
(boolean_literal) @constant.builtin
(integer_literal) @constant.builtin
(ipv4_literal) @constant.builtin
