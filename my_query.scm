(call_expression
  function: (path
    ((identifier)*)
    ((identifier) @constructor))
  (#match? @constructor "^[A-Z]"))

