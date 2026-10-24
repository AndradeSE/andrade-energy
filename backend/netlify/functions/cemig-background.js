const {timingSafeEqual}=require('node:crypto');
exports.handler=async event=>{
 const expected=process.env.CONTINGENCY_WORKER_SECRET,actual=event.headers?.['x-cemig-worker'];
 if(event.httpMethod!=='POST'||!expected||expected.length<32||typeof actual!=='string'||Buffer.byteLength(actual)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(expected),Buffer.from(actual)))return {statusCode:403};
 let id;try{id=JSON.parse(event.body||'{}').id;}catch{return {statusCode:400};}
 if(typeof id!=='string'||! /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))return {statusCode:400};
 const {executarCemigSimulacao}=require('../../dist/modules/usinas/cemigCloud.service.js');
 await executarCemigSimulacao(id);return {statusCode:200};
};
