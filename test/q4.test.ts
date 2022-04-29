import { expect } from 'chai';
import { parseL3, parseL3Exp } from '../imp/L3-ast';
import {bind, Result, makeOk, isOk, optionalValue} from '../shared/result';
import { l30ToJS } from '../src/q4';
import { parse as p } from "../shared/parser";

const l30toJSResult = (x: string): Result<string> =>
    bind(bind(p(x), parseL3Exp), l30ToJS);

describe('Q4 Tests', () => {
    it('parses primitive ops', () => {
        expect(l30toJSResult(`(+ 3 5 7)`)).to.deep.equal(makeOk(`(3 + 5 + 7)`));
        expect(l30toJSResult(`(= 3 (+ 1 2))`)).to.deep.equal(makeOk(`(3 === (1 + 2))`));
    });

    it('parses "if" expressions', () => {
        expect(l30toJSResult(`(if (> x 3) 4 5)`)).to.deep.equal(makeOk(`((x > 3) ? 4 : 5)`));
    });

    it('parses "lambda" expressions', () => {
        expect(l30toJSResult(`(lambda (x y) (* x y))`)).to.deep.equal(makeOk(`((x,y) => (x * y))`));
        expect(l30toJSResult(`((lambda (x y) (* x y)) 3 4)`)).to.deep.equal(makeOk(`((x,y) => (x * y))(3,4)`));
    });
    
    it("defines constants", () => {
        expect(l30toJSResult(`(define pi 3.14)`)).to.deep.equal(makeOk(`const pi = 3.14`));
    });

    it("defines functions", () => {
        expect(l30toJSResult(`(define f (lambda (x y) (* x y)))`)).to.deep.equal(makeOk(`const f = ((x,y) => (x * y))`));
    });

    it("applies user-defined functions", () => {
        expect(l30toJSResult(`(f 3 4)`)).to.deep.equal(makeOk(`f(3,4)`));
    });

    it("let expressions", () => {
        expect(l30toJSResult(`(let ((a 1) (b 2)) (+ a b))`)).to.deep.equal(makeOk(`((a,b) => (a + b))(1,2)`));
    });


    it('parses programs', () => {
        expect(bind(parseL3(`(L3 (define b (> 3 4)) (define x 5) (define f (lambda (y) (+ x y))) (define g (lambda (y) (* x y))) (if (not b) (f 3) (g 4)) ((lambda (x) (* x x)) 7))`), l30ToJS)).to.deep.equal(makeOk(`const b = (3 > 4);\nconst x = 5;\nconst f = ((y) => (x + y));\nconst g = ((y) => (x * y));\n((!b) ? f(3) : g(4));\n((x) => (x * x))(7)`));
    });

    it("literal expressions", () => {
        expect(l30toJSResult(`"a"`)).to.deep.equal(makeOk(`"a"`));
        expect(l30toJSResult(`'a`)).to.deep.equal(makeOk(`Symbol.for("a")`));
        expect(l30toJSResult(`symbol?`)).to.deep.equal(makeOk(`((x) => (typeof (x) === symbol))`))
        expect(l30toJSResult(`(string=? "a" "b")`)).to.deep.equal(makeOk(`("a" === "b")`))
    });

    it("testAvital1", () => {
        let x = l30toJSResult(`(+ 0 -3 15)`)
        expect(isOk(x)).to.deep.equal(true)
        let test = optionalValue(x)
        let res = eval(test)

    

        expect(l30toJSResult(`(string=? "a" "b")`)).to.deep.equal(makeOk(`("a" === "b")`))
        expect(l30toJSResult(`(+ 4 5)`)).to.deep.equal(makeOk(`(4+5)`))
    
    });

    it("AvitalLetTest1", () => {
        expect(l30toJSResult(`(let ((a 10) (b 20)) (> a b))`)).to.deep.equal(makeOk(`((a,b) => (a > b))(10,20)`));
    });

    it('Avital parses "lambda" expressions', () => {
        expect(l30toJSResult(`(lambda (x y) (+ x y))`)).to.deep.equal(makeOk(`((x,y) => (x + y))`));
        expect(l30toJSResult(`((lambda (x y) (> x y)) 1 2)`)).to.deep.equal(makeOk(`((x,y) => (x > y))(1,2)`));
    });

    it("Avital defines constants", () => {
        expect(l30toJSResult(`(define our_names "Nadav and Avital")`)).to.deep.equal(makeOk(`const our_names = "Nadav and Avital"`));
    });

    it("Avital defines functions", () => {
        expect(l30toJSResult(`(define f (lambda (x y) (= x y)))`)).to.deep.equal(makeOk(`const f = ((x,y) => (x === y))`));
    });

    it('Avital parses "if" expressions', () => {
        expect(l30toJSResult(`(if (= x 3) #t #f)`)).to.deep.equal(makeOk(`((x === 3) ? true : false)`));
    });

    it("Avital applies user-defined functions", () => {
        expect(l30toJSResult(`(f #t 20)`)).to.deep.equal(makeOk(`f(true,20)`));
    });

    it("Avital literal expressions", () => {
        expect(l30toJSResult(`"b"`)).to.deep.equal(makeOk(`"b"`));
        expect(l30toJSResult(`'5`)).to.deep.equal(makeOk(`Symbol.for("5")`));
    });




});