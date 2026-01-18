{/* score, tips, time of completion */}
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function ResultsScreen({navigation}: {navigation: any}) {
  return (
    <View style={styles.container}>
            {/* Header */}
            <Text style={styles.header}>My Results</Text>
    
            {/*Score in a circle here*/}
            <View style={styles.circle}>
                <Text style={{fontSize: 48, fontWeight: 'bold', alignSelf: 'center'}}>Score:</Text>
                <Text style={{fontSize: 24, fontWeight: '500', alignSelf: 'center'}}>score goes here</Text>
            </View>

            {/*Table*/}
            <View style={styles.table}>
                <View style={styles.row}>
                    <Text style={styles.label}>Time of Completion:
                    </Text>
                    <Text style={styles.value}>00:00</Text>
                </View>
            </View>
            
            <Text style={{fontSize: 20, top: 400, textDecorationLine: "underline", fontWeight: "bold", alignSelf: "center"}}>Tips and Feedback</Text>
            <Text style={{fontSize: 16, top: 420, marginHorizontal: 30, alignSelf: "center"}}>feedback goes here</Text>
        
            {/* Bottom Navigation Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => navigation.navigate("Home")}
                    >
                    <Text style={styles.navText}>Home</Text>
                </TouchableOpacity>
            </View>
        </View> 
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 80,
        alignItems: "center",
        backgroundColor: "#ee8d2f",
    },
    header: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 20,
        textDecorationLine: "underline",
    },
    circle: {
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignSelf: 'center',
        position: 'absolute',
        top: 120,
        marginVertical: 20,
    },
    table: {
        width: "90%",
        borderWidth: 1,
        borderColor: "#000",
        borderRadius: 8,
        overflow: "hidden",
        top: 350,
    },
    row: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        padding: 15,
        justifyContent: "space-between",
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
    },
    value: {
        fontSize: 16,
        color: "#000",
    },
    bottomBar: {
        flexDirection: "row",
        height: 79,
        borderTopWidth: 5,
        borderTopColor: "#000",
        justifyContent: "space-around",
        position: "absolute",
        bottom: 5,
        left: 0,
        right: 0,
        alignItems: "center",
        paddingBottom: 19, // Padding for safe area usually
        backgroundColor: "#ee8d2f",
    },
    navButton: {
        padding: 10,
    },
    navText: {
        fontSize: 16,
        color: "#333",
        fontWeight: "600",
    },
});

export default ResultsScreen;