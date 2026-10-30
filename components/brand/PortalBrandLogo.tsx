import Svg, { Defs, G, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

type Props = {
  width?: number;
  height?: number;
  light?: boolean;
};

export default function PortalBrandLogo({ width = 158, height = 44, light = true }: Props) {
  const wordColor = light ? "#FFFDF7" : "#06255A";

  return (
    <Svg accessibilityLabel="Andrade Energy" height={height} role="img" viewBox="0 0 790 220" width={width}>
      <Defs>
        <LinearGradient id="brandLeaf" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#5CF2A7" />
          <Stop offset="0.48" stopColor="#20CF7A" />
          <Stop offset="1" stopColor="#079454" />
        </LinearGradient>
      </Defs>
      <Path d="M26 179 C35 72 96 31 153 34 C202 36 229 72 235 127" fill="none" stroke="#FFD43B" strokeLinecap="round" strokeWidth="17" />
      <Path d="M45 190 L142 18 L237 190 L194 190 L142 94 L89 190 Z" fill={wordColor} />
      <SvgText fill={wordColor} fontSize="88" fontWeight="900" letterSpacing="-4" x="255" y="132">NDRADE</SvgText>
      <Path d="M258 180 H318" fill="none" stroke="#FFD43B" strokeLinecap="round" strokeWidth="7" />
      <SvgText fill="#25D17F" fontSize="35" fontWeight="800" letterSpacing="15" x="338" y="191">ENERGY</SvgText>
      <Path d="M580 180 H636 C648 180 654 176 654 169 C654 161 650 156 650 151" fill="none" stroke="#FFD43B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
      <G transform="translate(625 88)">
        <Path d="M25 58 C7 48 2 28 11 12 C20 -4 43 -8 58 3 C74 15 76 38 61 52 C55 58 52 62 51 69 H30 C29 64 28 61 25 58 Z" fill="#F6C928" />
        <Path d="M31 75 H51 M33 82 H49 M37 89 H45" fill="none" stroke="#FFD43B" strokeLinecap="round" strokeWidth="6" />
        <Path d="M-1 12 L-10 5 M72 11 L82 3 M35 -13 V-24 M76 47 L88 52" fill="none" stroke="#FFD43B" strokeLinecap="round" strokeWidth="6" />
      </G>
      <Path d="M25 184 C74 176 102 147 141 134 C183 120 226 128 276 151 C224 144 190 150 151 172 C109 196 65 204 25 184 Z" fill="url(#brandLeaf)" />
      <Path d="M42 184 C93 179 139 160 194 145 C219 138 242 142 263 149" fill="none" stroke="#ECFFF5" strokeLinecap="round" strokeOpacity="0.68" strokeWidth="2.3" />
      <Path d="M108 174 C113 161 121 151 134 139 M157 158 C164 145 174 137 187 132" fill="none" stroke="#ECFFF5" strokeLinecap="round" strokeOpacity="0.34" strokeWidth="1.5" />
    </Svg>
  );
}
