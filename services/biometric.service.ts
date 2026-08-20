import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const DIGITAL_ENABLED_LEGACY_KEY =
  "andrade_energy_fingerprint_enabled";

const DIGITAL_ENABLED_KEY_PREFIX =
  "andrade_energy_fingerprint_enabled_";

function chaveDigital(usuarioId?: string | number) {
  const id = String(usuarioId ?? "").trim();
  if (!id) return null;
  return `${DIGITAL_ENABLED_KEY_PREFIX}${id}`;
}

/**
 * Verifica se o dispositivo possui
 * suporte a biometria cadastrada (digital ou reconhecimento facial).
 */
export async function verificarDigitalDisponivel(): Promise<boolean> {
  try {
    const hasHardware =
      await LocalAuthentication.hasHardwareAsync();

    if (!hasHardware) {
      return false;
    }

    const tipos =
      await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (!tipos.length) {
      return false;
    }

    const enrolled =
      await LocalAuthentication.isEnrolledAsync();

    return enrolled;
  } catch (error) {
    console.log(
      "Erro ao verificar biometria:",
      error
    );

    return false;
  }
}

/**
 * Abre o prompt nativo do Android
 * para autenticação.
 */
export async function autenticarComDigital() {
  try {
    const disponivel =
      await verificarDigitalDisponivel();

    if (!disponivel) {
      return {
        success: false as const,
        error: "not_enrolled",
      };
    }

    const result =
      await LocalAuthentication.authenticateAsync({
        promptMessage:
          "Acesse o Andrade Energy",

        promptSubtitle:
          "Confirme sua identidade",

        promptDescription:
          "Use a biometria cadastrada para continuar.",

        cancelLabel:
          "Cancelar",

        // Alguns aparelhos Android classificam a impressão digital como
        // biometria "weak", embora ela seja válida para desbloquear o app.
        biometricsSecurityLevel:
          "weak",
      });

    return result;
  } catch (error) {
    console.log(
      "Erro na autenticação biométrica:",
      error
    );

    return {
      success: false as const,
      error: "unknown",
    };
  }
}

/**
 * Salva que o usuário ativou
 * o acesso por impressão digital.
 */
export async function ativarDigital(usuarioId?: string | number): Promise<void> {
  const chave = chaveDigital(usuarioId);
  if (!chave) throw new Error("Usuário não identificado para ativar a biometria.");
  await SecureStore.setItemAsync(
    chave,
    "true"
  );
}

/**
 * Remove a preferência.
 */
export async function desativarDigital(usuarioId?: string | number): Promise<void> {
  const chave = chaveDigital(usuarioId);
  if (!chave) return;
  await SecureStore.deleteItemAsync(chave);
}

/**
 * Retorna se o usuário ativou
 * a impressão digital no app.
 */
export async function digitalEstaAtiva(usuarioId?: string | number): Promise<boolean> {
  try {
    const chave = chaveDigital(usuarioId);
    if (!chave) return false;
    const value =
      await SecureStore.getItemAsync(
        chave
      );

    return value === "true";
  } catch (error) {
    console.log(
      "Erro ao consultar configuração da digital:",
      error
    );

    return false;
  }
}

/**
 * Migra a preferência antiga, que era compartilhada pelo aparelho, para a
 * conta que já possui uma sessão válida. Isso impede que uma conta use a
 * preferência biométrica de outra pessoa no mesmo celular.
 */
export async function migrarPreferenciaDigital(usuarioId?: string | number): Promise<boolean> {
  const chave = chaveDigital(usuarioId);
  if (!chave) return false;

  const atual = await SecureStore.getItemAsync(chave);
  if (atual !== null) return atual === "true";

  const legado = await SecureStore.getItemAsync(DIGITAL_ENABLED_LEGACY_KEY);
  if (legado === "true") {
    await Promise.all([
      SecureStore.setItemAsync(chave, "true"),
      SecureStore.deleteItemAsync(DIGITAL_ENABLED_LEGACY_KEY),
    ]);
    return true;
  }

  return false;
}
