;; extends

((type_identifier) @variable.builtin
 (#match? @variable.builtin "Self"))

; (use_declaration (identifier) @namespace)
; (use_declaration 
;     argument: (scoped_identifier
;         name: (identifier) @namespace))
; (use_wildcard (scoped_identifier
;     name: (identifier) @namespace))

":" @punctuation.delimiter

(crate) @keyword

[
(attribute_item)
(inner_attribute_item)
] @include

[
(mutable_specifier)
"struct"
"enum"
"move"
"ref"
"const"
"static"
"as"
] @keyword.operator

(macro_invocation ("!") @namespace)
(line_comment (doc_comment) @comment.documentation (#set! priority 200))
