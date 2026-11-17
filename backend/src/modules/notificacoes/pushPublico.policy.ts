/** Only fixed, non-personal guidance may be shown on the lock screen. */
export function textoPublicoPush(titulo: string): string | undefined {
  switch (titulo) {
    case 'Gmail · autorização expirada ou revogada':
      return 'Reconecte o Gmail no recebimento automático para retomar a importação das faturas.';
    case 'Gmail · autorize a leitura das faturas':
      return 'Reconecte o Gmail e permita a leitura dos e-mails para importar as faturas.';
    case 'Gmail · integração indisponível':
      return 'A integração Google precisa de configuração pela administração. Abra o app para ver os detalhes.';
    default:
      return undefined;
  }
}
