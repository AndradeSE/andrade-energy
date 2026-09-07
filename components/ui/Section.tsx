import {
    StyleSheet,

    Text,

    View,
} from "react-native";

import {
    Colors,
    Radius,

    Spacing,

    Typography,
} from "../../theme";

type Props={

title:string;
framed?:boolean;

children:any;

};

export default function Section({

title,
framed = true,

children,

}:Props){

return(

<View style={[styles.container, framed ? styles.frame : undefined]}>

<Text style={styles.title}>

{title}

</Text>

{children}

</View>

);

}

const styles=StyleSheet.create({

container:{

marginBottom:Spacing.xl,
},
frame:{
backgroundColor: Colors.surface,
borderWidth: 1,
borderColor: Colors.border,
borderRadius: Radius.xl,
padding: Spacing.md,

},

title:{

fontSize:Typography.section,

fontWeight:"700",

color:Colors.text,

marginBottom:Spacing.md,

},

});
