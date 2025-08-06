export enum TokenType {
	Whitespace = 'Whitespace',
	Operator = 'Operator',
	Embedded = 'Embedded',
	Constant = 'Constant',
	Identifier = 'Identifier',
	Punctuation = 'Punctuation',
}

interface BaseToken<T extends TokenType> {
	type: T;
	literal: string;
}

export interface EmbeddedToken extends BaseToken<TokenType.Embedded> {
	literal: '${}';
	value: any;
}
export interface ConstantToken extends BaseToken<TokenType.Constant> {
	value: string | number | bigint;
}

export type RopPunctuation = ',' | '.' | ':' | '(' | ')' | '[' | ']' | '{' | '}';
export interface PunctuationToken extends BaseToken<TokenType.Punctuation> {
	literal: RopPunctuation;
}
export interface OperatorToken extends BaseToken<TokenType.Operator> {}
export interface IdentifierToken extends BaseToken<TokenType.Identifier> {}
export interface WhitespaceToken extends BaseToken<TokenType.Whitespace> {}

export type Token = WhitespaceToken | OperatorToken | EmbeddedToken | ConstantToken | IdentifierToken | PunctuationToken;
