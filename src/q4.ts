import {
    AppExp, Binding,
    CExp,
    Exp, IfExp, isAppExp, isBinding,
    isBoolExp, isDefineExp, isExp, isIfExp, isLetExp,
    isLitExp,
    isNumExp,
    isPrimOp, isProcExp,
    isStrExp, isVarDecl,
    isVarRef, LetExp, LitExp, makeAppExp, makePrimOp, makeProcExp,
    PrimOp, ProcExp,
    Program, VarDecl
} from "../imp/L3-ast"

import {Result, makeOk} from "../shared/result";
import {isEmptySExp, isSymbolSExp, SymbolSExp} from "../imp/L3-value";
import {map} from "ramda"

/*
Purpose: rewrite a single LetExp as a lambda-application form
Signature: rewriteLet(cexp)
Type: [LetExp => AppExp]
*/


const MAKELIST_FUNCTION = "((...params) => {\n" +
"    let val =   Symbol.for(\"()\");\n" +
"    params.reverse().forEach((param) => {val = [param, val]});\n" +
"    return val;\n" +
"})"

const letToApp = (e: LetExp): AppExp => {
    const vars: VarDecl[] = map((b) => b.var, e.bindings);
    const vals: CExp[] = map((b) => b.val, e.bindings);
    return makeAppExp(makeProcExp(vars, e.body), vals);
}
const isNotEmptySymbolExp: (e: any) => boolean = (e: any) => isLitExp(e) &&  isSymbolSExp(e.val)
const isEmptySymbolExp: (e: any) => boolean = (e: any) => isLitExp(e) && isEmptySExp(e.val)
const escapeQuotes: (s: string) => string = (s: string) => String.raw`${s}`
const l3StringToJSString: (s: string) => string = (s: string) => `"${escapeQuotes(s)}"`
const l3SymbolToJSString: (s: string) => string = (s: string) => `Symbol.for("${s}")`
const boolToJSString: (b: boolean) => string = (b: boolean) => b ? "true" : "false"

const l3IfToJSString: (e: IfExp) => string = (e: IfExp) => `(${translateExpToJS(e.test)} ? ${translateExpToJS(e.then)} : ${translateExpToJS(e.alt)})`
const fixIllegalCharsInVars: (varName: string) => string = (varName: string) =>
    varName.replace(/-/gi, "_").replace(/>/gi, "_right_arrow_").replace(/\?/gi, "_question_mark_")

const l3ProcToLambdaJSString: (e: ProcExp) => string = (e: ProcExp) => {
    let s = "(("
    for(let i=0; i<e.args.length; i++) {
        s += translateExpToJS(e.args[i])
        if(i < e.args.length-1)
            s += ","
    }
    s += ") => "

    if(e.body.length > 1)
        throw "To many arguments for lambda"
    s += translateExpToJS(e.body[0])
    s += ")"

    return s
}


const jsPairArithmetic: (operator: string, rands: CExp[]) => string = (operator: string, rands: CExp[]) => {
    if(rands.length != 2)
        throw "Cannot apply " + operator + " on " + rands.length + " parameters"
    return "(" + translateExpToJS(rands[0]) + " " + operator + " " + translateExpToJS(rands[1]) + ")"
}

const jsArithmetic: (operator: string, rands: CExp[]) => string = (operator: string, rands: CExp[]) => {
    if(rands.length === 0)
        throw "Operator " + operator + " has no parameters!"
    if(rands.length === 1)
        return translateExpToJS(rands[0])
    let s = "("
    if(operator != ",")
        operator = " " + operator + " "
    for(let i=0; i<rands.length; i++) {
        s += translateExpToJS(rands[i])
        if(i < rands.length-1) {
            s += operator
        }
    }
    s += ")"
    return s
}

const jsNot: (rands: CExp[]) => string = (rands: CExp[]) => {
    if(rands.length != 1)
        throw "Cannot apply 'not' operator on " + rands.length + " parameters"

    return "(!" + translateExpToJS(rands[0]) + ")"
}

const jsTypeEquals: (jsType: string, rands: CExp[]) => string = (jsType: string, rands: CExp[]) => {
    if(rands.length != 1)
        throw "Cannot apply 'typeequals' operator on " + rands.length + " parameters"
    return `(typeof(${translateExpToJS(rands[0])}) === "${jsType}")`
}

const jsIsPair: (rands: CExp[]) => string = (rands: CExp[]) => {
    if(rands.length != 1)
        throw "Cannot apply 'isPair' operator on " + rands.length + " parameters"
    return `Array.isArray(${translateExpToJS(rands[0])})`
}
const jsIsString: (rands: CExp[]) => string = (rands: CExp[]) => {
    if(rands.length != 1)
        throw "Cannot apply 'isString' operator on " + rands.length + " parameters"
    return `(typeof(${translateExpToJS(rands[0])}) === 'string')`
}

const jsGetFromPair: (index: number, rands: CExp[]) => string = (index: number, rands: CExp[]) => {
    if(rands.length != 1)
        throw "Cannot apply '[ " + index + "]' operator on " + rands.length + " parameters"
    return translateExpToJS(rands[0]) + "[" + index + "]"
}

const jsApplyFunction: (functionName: string, rands: CExp[]) => string = (functionName: string, rands: CExp[]) => {
    let s = functionName + "("
    for(let i=0; i<rands.length; i++) {
        s += translateExpToJS(rands[i])
        if(i<rands.length-1)
            s += ","
    }
    s += ")"

    return s
}

const jsCreateList: (rands: CExp[]) => string = (rands: CExp[]) => {
    let params = "("
    rands.forEach((r) => {
        params += translateExpToJS(r) + ","
    })
    params = params.substring(0, params.length-1) + ")"
    return MAKELIST_FUNCTION + params
}
const jsCreatePair: (rands: CExp[]) => string = (rands: CExp[]) => `[${translateExpToJS(rands[0])}, ${translateExpToJS(rands[1])}]`


const l3PrimOpToJSLambdaString: (e: PrimOp) => string = (e: PrimOp) => {
    switch (e.op) {
        case "+":
        case "-":
            return `((...args) => args.reduce(((x,y)=>x${e.op}y), 0))`
        case "*":
        case "/":
            return `((...args) => args.reduce(((x,y)=>x${e.op}y), 1))`
        case "<":
        case ">":
            return `((x,y) => x${e.op}y)`
        case "and":
            return `((...args) => args.reduce(((x,y)=>x&y), true))`
        case "or":
            return `((...args) => args.reduce(((x,y)=>x|y), false))`
        case "=":
        case "eq?":
            return `((x,y) => x===y)`
        case "string=?":
            return `((x, y) => x===y)`
        case "not":
            return `((x) => !x)`
        case "symbol?":
            return `((x) => typeof(x) === "symbol")`
        case "pair?":
            return `((x) => Array.isArray(x))`
        case "boolean?":
            return `((x) => typeof(x) === "boolean")`
        case "number?":
            return `((x) => typeof(x) === "number")`
        case "string?":
            return `((x) => typeof(x) === "string")`
        case "car":
            return `((x) => x[0])`
        case "cdr":
            return `((x) => x[1])`
        case "cons":
            return '((x, y) => [x, y])'
        case "list":
            return MAKELIST_FUNCTION
    }
    throw new Error("Unrecognized operator: " + JSON.stringify(e))
}
const l3AppToJSString: (e: AppExp) => string = (e: AppExp) => {
    if (isPrimOp(e.rator)) {
        switch (e.rator.op) {
            case "+":
            case "-":
            case "*":
            case "/":
                return jsArithmetic(e.rator.op, e.rands)
            case "and":
                return jsArithmetic("&", e.rands)
            case "or":
                return jsArithmetic("|", e.rands)
            case "<":
            case ">":
                return jsPairArithmetic(e.rator.op, e.rands)
            case "=":
            case "eq?":
            case "string=?":
                return jsPairArithmetic("===", e.rands)
            case "not":
                return jsNot(e.rands)
            case "string?":
                return jsIsString(e.rands)
            case "symbol?":
                return jsTypeEquals("symbol", e.rands)
            case "pair?":
                return jsIsPair(e.rands)
            case "boolean?":
                return jsTypeEquals("boolean", e.rands)
            case "number?":
                return jsTypeEquals("number", e.rands)
            case "car":
                return jsGetFromPair(0, e.rands)
            case "cdr":
                return jsGetFromPair(1, e.rands)
            case "cons":
                return jsCreatePair(e.rands)
            case "list":
                return jsCreateList(e.rands)
        }
    }
    if(isVarRef(e.rator))
        return jsApplyFunction(fixIllegalCharsInVars(e.rator.var), e.rands)
    else if(isProcExp(e.rator)) {
        let lambdaWithParams = l3ProcToLambdaJSString(e.rator) + "("
        for(let i=0; i<e.rands.length; i++) {
            lambdaWithParams += translateExpToJS(e.rands[i])
            if(i<e.rands.length-1)
                lambdaWithParams += ","
        }
        lambdaWithParams += ")"
        return lambdaWithParams
    }

    throw new Error("Unrecognized operator: " + JSON.stringify(e.rator))
}

const translateExpToJS: (exp: Exp | VarDecl) => string = (exp: Exp | VarDecl | Binding) => {
    if(isDefineExp(exp))
        return "const " + translateExpToJS(exp.var) + " = " + translateExpToJS(exp.val)
    if(isNumExp(exp))
        return exp.val.toString()
    if(isBoolExp(exp))
        return boolToJSString(exp.val)
    if(isStrExp(exp))
        return l3StringToJSString(exp.val)
    if(isNotEmptySymbolExp(exp))
        return l3SymbolToJSString(((exp as LitExp).val as SymbolSExp).val)
    if(isEmptySymbolExp(exp))
        return l3SymbolToJSString("()")
    if(isIfExp(exp))
        return l3IfToJSString(exp)
    if(isVarRef(exp) || isVarDecl(exp))
        return fixIllegalCharsInVars(exp.var)
    if(isLetExp(exp))
        return l3AppToJSString(letToApp(exp))
    if(isProcExp(exp))
        return l3ProcToLambdaJSString(exp)
    if(isAppExp(exp))
        return l3AppToJSString(exp)
    if(isBinding(exp))
        return translateExpToJS(exp.var) + " = " + translateExpToJS(exp.val)
    if(isPrimOp(exp))
        return l3PrimOpToJSLambdaString(exp)
    if(isLitExp(exp))
        return `Symbol.for("${exp.val}")`

    throw "Unrecognized expression" + JSON.stringify(exp)

}

const translateProgramToJS: (program: Program) => string = (program: Program) =>  {
    let jsCode = ""

    program.exps.forEach((exp: Exp) => {
        jsCode += translateExpToJS(exp)
        jsCode += ";\n"
    })

    return jsCode.substring(0, jsCode.length-2)

}

export const l30ToJS = (exp: Exp | Program): Result<string>  => {
    if (isExp(exp))
        return makeOk(translateExpToJS(exp))
    return makeOk(translateProgramToJS(exp))
}
