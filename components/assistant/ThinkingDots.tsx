import {useEffect,useRef} from "react";
import {Animated,StyleSheet,View} from "react-native";
import {Colors} from "../../theme";

export default function ThinkingDots() {
  const dots=useRef([new Animated.Value(0.25),new Animated.Value(0.25),new Animated.Value(0.25)]).current;
  useEffect(()=>{
    const animations=dots.map((dot,index)=>Animated.loop(Animated.sequence([
      Animated.delay(index*140),
      Animated.timing(dot,{toValue:1,duration:250,useNativeDriver:true}),
      Animated.timing(dot,{toValue:0.25,duration:250,useNativeDriver:true}),
      Animated.delay((2-index)*140+250),
    ])));
    animations.forEach(animation=>animation.start());
    return ()=>animations.forEach(animation=>animation.stop());
  },[dots]);
  return <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel="Solar está preparando a resposta" accessibilityLiveRegion="polite">
    {dots.map((opacity,index)=><Animated.View key={index} style={[styles.dot,{opacity,transform:[{translateY:opacity.interpolate({inputRange:[0.25,1],outputRange:[0,-3]})}]}]} />)}
  </View>;
}
const styles=StyleSheet.create({row:{flexDirection:"row",alignItems:"center",gap:6,height:22,paddingHorizontal:2},dot:{width:7,height:7,borderRadius:4,backgroundColor:Colors.subtitle}});
