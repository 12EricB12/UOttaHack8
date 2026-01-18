import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

function UserStatsScreen({navigation}: {navigation: any}) {
  return (
    <View style={styles.container}>
        {/* Header */}
        <Text style={styles.header}>My Statistics</Text>

        {/*Table*/}
        <View style={styles.table}>
            <View style={styles.row}>
            <Text style={styles.label}>Total Reps Done</Text>
            <Text style={styles.value}>reps done #</Text>
            </View>

            <View style={styles.row}>
            <Text style={styles.label}>Total Form Score</Text>
            <Text style={styles.value}>form #</Text>
            </View>

            <View style={styles.row}>
            <Text style={styles.label}>Total Intensity Score</Text>
            <Text style={styles.value}>instensity #</Text>
            </View>

            <View style={styles.row}>
            <Text style={styles.label}>Games Won</Text>
            <Text style={styles.value}>wins #</Text>
            </View>
        </View>
    
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
        backgroundColor: "#a998d7",
    },
    header: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 20,
        textDecorationLine: "underline",
    },
    table: {
        width: "90%",
        borderWidth: 1,
        borderColor: "#000",
        borderRadius: 8,
        overflow: "hidden",
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
        color: "#555",
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
        backgroundColor: "#a998d7",
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

export default UserStatsScreen;