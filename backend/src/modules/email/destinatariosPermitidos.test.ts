import assert from "node:assert/strict";
import test from "node:test";
import { emailDestinatarioPermitido } from "./destinatariosPermitidos";

test("mantém o envio normal sem restrição configurada", () => {
  const anterior = process.env.EMAIL_DESTINATARIOS_PERMITIDOS;
  try {
    delete process.env.EMAIL_DESTINATARIOS_PERMITIDOS;
    assert.equal(emailDestinatarioPermitido("cliente@example.com"), true);
  } finally {
    if (anterior === undefined) delete process.env.EMAIL_DESTINATARIOS_PERMITIDOS;
    else process.env.EMAIL_DESTINATARIOS_PERMITIDOS = anterior;
  }
});

test("bloqueia por padrão quando a lista está vazia", () => {
  const anterior = process.env.EMAIL_DESTINATARIOS_PERMITIDOS;
  try {
    process.env.EMAIL_DESTINATARIOS_PERMITIDOS = "";
    assert.equal(emailDestinatarioPermitido("cliente@example.com"), false);
  } finally {
    if (anterior === undefined) delete process.env.EMAIL_DESTINATARIOS_PERMITIDOS;
    else process.env.EMAIL_DESTINATARIOS_PERMITIDOS = anterior;
  }
});

test("aceita apenas destinatários explicitamente permitidos", () => {
  const anterior = process.env.EMAIL_DESTINATARIOS_PERMITIDOS;
  try {
    process.env.EMAIL_DESTINATARIOS_PERMITIDOS = " teste@example.com ; admin@example.com";
    assert.equal(emailDestinatarioPermitido("TESTE@example.com "), true);
    assert.equal(emailDestinatarioPermitido("cliente@example.com"), false);
  } finally {
    if (anterior === undefined) delete process.env.EMAIL_DESTINATARIOS_PERMITIDOS;
    else process.env.EMAIL_DESTINATARIOS_PERMITIDOS = anterior;
  }
});
