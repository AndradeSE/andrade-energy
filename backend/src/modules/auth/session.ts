export function publicSessionUser(user: Record<string, unknown>) {
  const allowed = ["id", "nome", "email", "telefone", "cpf", "perfil", "cliente_id", "empresa_id", "papel_empresa", "permissoes"];
  return Object.fromEntries(allowed.filter(key => key in user).map(key => [key, user[key]]));
}
export async function revokeAuthenticatedSession(db: { from: (table: string) => any }, sessionId: unknown, userId: unknown) {
  if (typeof sessionId !== "string" || !sessionId || typeof userId !== "string" || !userId) throw new Error("Sessão inválida.");
  const { error } = await db.from("sessoes_usuarios")
    .update({ revogada_em: new Date().toISOString() })
    .eq("id", sessionId).eq("usuario_id", userId).is("revogada_em", null);
  if (error) throw new Error("Não foi possível encerrar a sessão.");
}
