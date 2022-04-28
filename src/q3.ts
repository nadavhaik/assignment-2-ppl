import {
    CExp,
    Exp,
    isAppExp,
    isAtomicExp,
    isDefineExp, isIfExp,
    isLetExp, isLetStarExp, isLitExp,
    isProcExp,
    isProgram, makeAppExp, makeDefineExp,
    makeProgram,
    Program,
    isCExp, makeIfExp, makeProcExp, Binding, makeBinding,
    makeLetExp, makeLetStarExp, LetStarExp, LetExp
} from "./L31-ast";
import {Result, makeFailure, makeOk, mapv, mapResult, bind, isOk, rbind} from "../shared/result";


/*
Purpose: Transform L31 AST to L3 AST
Signature: l31ToL3(l31AST)
Type: [Exp | Program] => Result<Exp | Program>
*/

export const resultOkVal = <T>(res: Result<T>): T => {
    if(!isOk(res))
        throw res.message
    return res.value
}
export const L31ToL3Binding = (binding: Binding): Result<Binding> =>
    makeOk(makeBinding(binding.var.var, resultOkVal(L31ToL3CExp(binding.val))))

export const letStarToLet = (letStar: LetStarExp): LetExp => {
    let letExp = null
    let nextBody = letStar.body
    letStar.bindings.reverse().forEach((binding: Binding) => {
        letExp = makeLetExp([binding], nextBody)
        nextBody = [letExp]
    })
    if(letExp === null)
        throw "An unknown error has occurred"
    return letExp
}

export const L31ToL3CExp = (exp: CExp): Result<CExp> => {
    if(isAtomicExp(exp))
        return makeOk(exp)
    else if(isAppExp(exp)) {
        let translatedRands: CExp[] = []
        exp.rands.forEach((e: CExp) => translatedRands.push(resultOkVal(L31ToL3CExp(e))))
        return makeOk(makeAppExp(resultOkVal(L31ToL3CExp(exp.rator)), translatedRands))
    }
    else if(isIfExp(exp))
        return makeOk(makeIfExp(resultOkVal(L31ToL3CExp(exp.test)),
            resultOkVal(L31ToL3CExp(exp.then)), resultOkVal(L31ToL3CExp(exp.alt))))
    else if(isProcExp(exp)) {
        let translatedExps: CExp[] = []
        exp.body.forEach((e: CExp) => translatedExps.push(resultOkVal(L31ToL3CExp(e))))
        return makeOk(makeProcExp(exp.args, translatedExps))
    }
    else if(isLetExp(exp)) {
        let translatedBindings: Binding[] = []
        let translatedExps: CExp[] = []
        exp.bindings.forEach((b: Binding) => translatedBindings.push(resultOkVal(L31ToL3Binding(b))))
        exp.body.forEach((e: CExp) => translatedExps.push(resultOkVal(L31ToL3CExp(e))))
        return makeOk(makeLetExp(translatedBindings, translatedExps))
    }
    else if(isLitExp(exp))
        return makeOk(exp)
    else if(isLetStarExp(exp)) {
        let translatedBindings: Binding[] = []
        let translatedExps: CExp[] = []
        exp.bindings.forEach((b: Binding) => translatedBindings.push(resultOkVal(L31ToL3Binding(b))))
        exp.body.forEach((e: CExp) => translatedExps.push(resultOkVal(L31ToL3CExp(e))))
        return makeOk(letStarToLet(makeLetStarExp(translatedBindings, translatedExps)))
    }

    throw "Unknown Expression"

}

export const L31ToL3Exp = (exp: Exp): Result<Exp> => {
    if(isDefineExp(exp))
        return makeOk(makeDefineExp(exp.var, resultOkVal(L31ToL3CExp(exp.val))))
    else if(isCExp(exp))
        return L31ToL3CExp(exp)
    throw "Unknown expression"
}

export const L31ToL3 = (exp: Exp | Program): Result<Exp | Program> =>{
    if(isProgram(exp)) {
        let exps: Exp[] = []
        exp.exps.forEach((e : Exp) => {
            let translated = L31ToL3Exp(e)
            if(isOk(translated))
                exps.push(translated.value)
        })
        return makeOk(makeProgram(exps))
    }
    return L31ToL3Exp(exp)

}


