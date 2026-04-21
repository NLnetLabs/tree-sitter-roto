#include "tree_sitter/array.h"
#include "tree_sitter/parser.h"

#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

enum TokenType {
    STRING_START,
    STRING_CONTENT,
    ESCAPE_INTERPOLATION,
    STRING_END,
};

typedef enum {
    Format = 1 << 0,
} Flags;

typedef struct {
    char flags;
} Delimiter;

typedef struct {
    Array(Delimiter) delimiters;
} Scanner;

static Delimiter new_delimiter() {
    return (Delimiter){0};
}

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

bool tree_sitter_roto_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
    Scanner *scanner = (Scanner *)payload;

    // printf("\n");
    // printf("col: %d\n", lexer->get_column(lexer));
    // printf("lookahead: '%c'\n", lexer->lookahead);
    // printf("STRING_START: %d\n", valid_symbols[STRING_START]);
    // printf("STRING_END: %d\n", valid_symbols[STRING_END]);
    // printf("ESCAPE_INTERPOLATION: %d\n", valid_symbols[ESCAPE_INTERPOLATION]);
    // printf("STRING_CONTENT: %d\n", valid_symbols[STRING_CONTENT]);

    if (valid_symbols[STRING_END]) {
        if (lexer->lookahead == '"') {
            array_pop(&scanner->delimiters);
            advance(lexer);
            lexer->mark_end(lexer);
            lexer->result_symbol = STRING_END;
            // printf("Final: STRING_END\n");
            return true;
        }
    }

    if (valid_symbols[ESCAPE_INTERPOLATION]) {
        if (lexer->lookahead == '{') {
            advance(lexer);

            if (lexer->lookahead == '{') {
                advance(lexer);
                lexer->mark_end(lexer);
                lexer->result_symbol = ESCAPE_INTERPOLATION;
                // printf("Final: ESCAPE_INTERPOLATION\n");
                return true;
            } else {
                // printf("Final: Nothing!\n");
                return false;
            }
        }

        if (lexer->lookahead == '}') {
            advance(lexer);

            if (lexer->lookahead == '}') {
                advance(lexer);
                lexer->mark_end(lexer);
                lexer->result_symbol = ESCAPE_INTERPOLATION;
                // printf("Final: ESCAPE_INTERPOLATION\n");
                return true;
            } else {
                // printf("Final: Nothing!\n");
                return false;
            }
        }
    }

    if (valid_symbols[STRING_CONTENT]) {
        Delimiter *delimiter = array_back(&scanner->delimiters);

        bool has_advanced = false;
        while (lexer->lookahead) {
            // If we're in a format string then '{' stops the string.
            if (delimiter->flags | Format && lexer->lookahead == '{') {
                break;
            }

            // In both format and non-format strings, '"' ends the string.
            if (lexer->lookahead == '"') {
                break;
            }

            // In both format and non-format strings, '\\' starts an escape
            // sequence, which is just part of the grammar.
            if (lexer->lookahead == '\\') {
                break;
            }

            has_advanced = true;
            advance(lexer);
        }

        if (has_advanced) {
            lexer->mark_end(lexer);
            // printf("Final: STRING_CONTENT\n");
            lexer->result_symbol = STRING_CONTENT;
            return true;
        }
    }

    if (valid_symbols[STRING_START]) {
        Delimiter delimiter = new_delimiter();

        while (
            lexer->lookahead == '\n'
            || lexer->lookahead == ' '
            || lexer->lookahead == '\r'
            || lexer->lookahead == '\t'
        ) {
            advance(lexer);
        }
        if (lexer->lookahead == 'f') {
            delimiter.flags |= Format;
            advance(lexer);
        }

        if (lexer->lookahead == '"') {
            advance(lexer);
            array_push(&scanner->delimiters, delimiter);
            lexer->mark_end(lexer);
            lexer->result_symbol = STRING_START;
            // printf("Final: STRING_START\n");
            return true;
        } else {
            // printf("Final: Nothing!\n");
            return false;
        }
    }

    // printf("Final: Nothing!\n");
    return false;
}

void* tree_sitter_roto_external_scanner_create() {
    Scanner *scanner = ts_malloc(sizeof(Scanner));
    array_init(&scanner->delimiters);
    return scanner;
}

void tree_sitter_roto_external_scanner_destroy(void *payload) {
    Scanner *scanner = (Scanner *)payload;
    array_delete(&scanner->delimiters);
    free(scanner);
}

unsigned tree_sitter_roto_external_scanner_serialize(
    void *payload,
    char *buffer
) {
    size_t size = 0;
    Scanner *scanner = (Scanner *)payload;

    size_t delimiter_count = scanner->delimiters.size;
    if (delimiter_count > UINT8_MAX) {
        delimiter_count = UINT8_MAX;
    }
    buffer[size++] = (char)delimiter_count;

    if (delimiter_count > 0) {
        memcpy(&buffer[size], scanner->delimiters.contents, delimiter_count);
    }
    size += delimiter_count;

    return size;
}

void tree_sitter_roto_external_scanner_deserialize(
    void *payload,
    const char *buffer,
    unsigned length
) {
    Scanner *scanner = (Scanner *)payload;

    array_delete(&scanner->delimiters);

    if (length > 0) {
        size_t size = 0;

        size_t delimiter_count = (uint8_t)buffer[size++];
        if (delimiter_count > 0) {
            array_reserve(&scanner->delimiters, delimiter_count);
            scanner->delimiters.size = delimiter_count;
            memcpy(scanner->delimiters.contents, &buffer[size], delimiter_count);
            size += delimiter_count;
        }
    }
}
