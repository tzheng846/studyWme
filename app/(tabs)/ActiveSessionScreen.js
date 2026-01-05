import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth, subscribeToSession, endSession, addViolation } from '../services/firebase';
import ViolationList from '../components/ViolationList';

const ActiveSessionScreen = () => {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams();
  const [session, setSession] = useState(null);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToSession(sessionId, (data) => {
      setSession(data);
      if (data.status === 'ended') {
        router.replace({ pathname: 'SessionReportScreen', params: { sessionId } });
      }
    });

    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
    if (session?.status === 'active') {
      const interval = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReportViolation = () => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    Alert.alert(
      'Report Violation',
      'Did you check your phone or leave the app?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, I did',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!auth.currentUser) {
                Alert.alert('Error', 'You must be logged in');
                return;
              }
              await addViolation(sessionId, auth.currentUser.uid, 'phone_check');
              Alert.alert('Recorded', 'Violation has been recorded');
            } catch (error) {
              Alert.alert('Error', 'Failed to record violation');
            }
          },
        },
      ]
    );
  };

  const handleEndSession = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this study session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              await endSession(sessionId);
            } catch (error) {
              Alert.alert('Error', 'Failed to end session');
            }
          },
        },
      ]
    );
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <Text>Loading session...</Text>
      </View>
    );
  }

  const targetMinutes = session.duration;
  const elapsedMinutes = Math.floor(timer / 60);
  const progress = Math.min((elapsedMinutes / targetMinutes) * 100, 100);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Timer Display */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(timer)}</Text>
          <Text style={styles.timerSubtext}>
            Target: {targetMinutes} minutes
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Session Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📚 Study in Progress</Text>
          <Text style={styles.infoText}>
            Participants: {session.participants?.length || 1}
          </Text>
          <Text style={styles.infoText}>
            Total Violations: {session.violations?.length || 0}
          </Text>
        </View>

        {/* Violations List */}
        <View style={styles.violationsContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {session.violations && session.violations.length > 0 ? (
            <ViolationList violations={session.violations} />
          ) : (
            <Text style={styles.noViolationsText}>
              No violations yet! Keep it up! 🎉
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.violationButton}
          onPress={handleReportViolation}
        >
          <Text style={styles.violationButtonText}>📱 I Checked My Phone</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endButton}
          onPress={handleEndSession}
        >
          <Text style={styles.endButtonText}>End Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
},
timerContainer: {
alignItems: 'center',
paddingVertical: 30,
backgroundColor: '#f8f9fa',
borderRadius: 12,
marginBottom: 20,
},
timerText: {
fontSize: 64,
fontWeight: 'bold',
color: '#007AFF',
},
timerSubtext: {
fontSize: 16,
color: '#666',
marginTop: 5,
},
progressBar: {
width: '80%',
height: 8,
backgroundColor: '#e0e0e0',
borderRadius: 4,
marginTop: 15,
overflow: 'hidden',
},
progressFill: {
height: '100%',
backgroundColor: '#007AFF',
borderRadius: 4,
},
infoCard: {
backgroundColor: '#f0f8ff',
padding: 15,
borderRadius: 8,
marginBottom: 20,
},
infoTitle: {
fontSize: 18,
fontWeight: '600',
marginBottom: 10,
color: '#333',
},
infoText: {
fontSize: 14,
color: '#666',
marginVertical: 2,
},
violationsContainer: {
marginBottom: 20,
},
sectionTitle: {
fontSize: 18,
fontWeight: '600',
marginBottom: 10,
color: '#333',
},
noViolationsText: {
textAlign: 'center',
color: '#999',
fontSize: 16,
padding: 20,
},
buttonsContainer: {
padding: 15,
borderTopWidth: 1,
borderTopColor: '#eee',
},
violationButton: {
backgroundColor: '#FF9500',
padding: 15,
borderRadius: 8,
alignItems: 'center',
marginBottom: 10,
},
violationButtonText: {
color: '#fff',
fontSize: 16,
fontWeight: '600',
},
endButton: {
backgroundColor: '#FF3B30',
padding: 15,
borderRadius: 8,
alignItems: 'center',
},
endButtonText: {
color: '#fff',
fontSize: 16,
fontWeight: '600',
},
});export default ActiveSessionScreen;