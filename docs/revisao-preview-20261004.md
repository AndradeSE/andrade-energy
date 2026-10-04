# Revisão do Preview — 04/10/2026

## Escopo

- Fundo original do portal atrás da logo animada somente na abertura. Carregamento interno preservado.
- Oito tutoriais reconstruídos de capturas reais, com censura localizada por borrão, setas para controles largos, cortes simultâneos de áudio e vídeo e áudio limitado.
- Quantidade de UCs retornada na listagem de clientes.
- Histórico de atualização identificado por revisão e aplicativo.

## Verificações

- 57 testes de backend passaram com configuração isolada, sem cobranças reais.
- TypeScript do app e compilação da web/backend passaram.
- Validação de vídeo verifica 30 fps de saída, AAC em português e decodificação integral. Converter para 30 fps não recupera quadros ausentes na captura original.
- Revisão visual usa folhas de contato; não equivale a uma aprovação de sincronização de cada palavra pelo usuário.

## Pendências não encobertas

- Fluxo autenticado web completo de assinatura/pagamento/convite ainda não validado.
- Gravação do fluxo de fatura automática do consumidor depende de completar sua configuração real no Preview.
- APKs novos e aprovação da produção não são comprovados por esta revisão.
- Não constitui avaliação jurídica ou aprovação LGPD.

## Reprodução dos vídeos

Os editores originais estão em `C:/Users/vini_/andrade-energy/scripts`, geram candidatos não destrutivos em `outputs/tutorial-previews` e nunca devem distribuir as capturas brutas.
Use `REBUILT_TUTORIAL_DIR` para apontar o revisor de ritmo a esses candidatos. Execute em seguida `finalize_tutorial_audio_20261004.mjs` e `verify_tutorial_candidates_20261004.mjs`, revisando visualmente as folhas antes de substituir os assets.
