import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const DIGITAL_ENABLED_KEY =
  "andrade_energy_fingerprint_enabled";

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

        // Acesso por biometria deve exibir a digital/rosto do aparelho,
        // sem trocar o fluxo pelo PIN do dispositivo.
        disableDeviceFallback:
          true,

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
export async function ativarDigital(): Promise<void> {
  await SecureStore.setItemAsync(
    DIGITAL_ENABLED_KEY,
    "true"
  );
}

/**
 * Remove a preferência.
 */
export async function desativarDigital(): Promise<void> {
  await SecureStore.deleteItemAsync(
    DIGITAL_ENABLED_KEY
  );
}

/**
 * Retorna se o usuário ativou
 * a impressão digital no app.
 */
export async function digitalEstaAtiva(): Promise<boolean> {
  try {
    const value =
      await SecureStore.getItemAsync(
        DIGITAL_ENABLED_KEY
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
