import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Colors, Radius, Spacing, Typography } from "../theme";

export default function PdfPasswordRetryModal({ visible, busy, onCancel, onConfirm }: { visible: boolean; busy?: boolean; onCancel: () => void; onConfirm: (password: string) => void }) {
  const [password, setPassword] = useState("");
  useEffect(() => { if (!visible) setPassword(""); }, [visible]);
  return <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
    <View style={styles.backdrop}><View style={styles.card}>
      <Text style={styles.eyebrow}>PDF PROTEGIDO</Text><Text style={styles.title}>Informe a senha da fatura</Text>
      <Text style={styles.copy}>A tentativa automática não abriu este arquivo. Digite os 4 primeiros números do CPF do titular da UC.</Text>
      <TextInput autoFocus editable={!busy} inputMode="numeric" keyboardType="number-pad" maxLength={4} onChangeText={(value) => setPassword(value.replace(/\D/g, "").slice(0, 4))} placeholder="4 números" secureTextEntry style={styles.input} value={password} />
      <View style={styles.actions}><TouchableOpacity disabled={busy} onPress={onCancel} style={styles.secondary}><Text style={styles.secondaryText}>Cancelar</Text></TouchableOpacity><TouchableOpacity disabled={busy || password.length !== 4} onPress={() => onConfirm(password)} style={[styles.primary, (busy || password.length !== 4) && styles.disabled]}><Text style={styles.primaryText}>{busy ? "Validando..." : "Validar PDF"}</Text></TouchableOpacity></View>
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({ backdrop:{flex:1,justifyContent:"center",padding:Spacing.lg,backgroundColor:"rgba(3,24,17,.62)"},card:{padding:Spacing.lg,borderRadius:Radius.lg,backgroundColor:Colors.surface},eyebrow:{color:Colors.primary,fontSize:Typography.small,fontWeight:"800",letterSpacing:1},title:{marginTop:Spacing.xs,color:Colors.text,fontSize:22,fontWeight:"800"},copy:{marginTop:Spacing.sm,color:Colors.subtitle,lineHeight:21},input:{marginTop:Spacing.lg,padding:14,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.md,color:Colors.text,backgroundColor:Colors.background,fontSize:18,letterSpacing:5,textAlign:"center"},actions:{flexDirection:"row",justifyContent:"flex-end",gap:Spacing.sm,marginTop:Spacing.lg},secondary:{paddingVertical:12,paddingHorizontal:16},secondaryText:{color:Colors.text,fontWeight:"700"},primary:{paddingVertical:12,paddingHorizontal:18,borderRadius:Radius.md,backgroundColor:Colors.primary},disabled:{opacity:.45},primaryText:{color:Colors.surface,fontWeight:"800"} });
