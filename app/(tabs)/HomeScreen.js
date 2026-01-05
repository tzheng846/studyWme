import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { auth, getUserSessions, logout, getUser } from '../services/firebase';
import SessionCard from '../components/SessionCard';

const HomeScreen = () => {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userData = await getUser(currentUser.uid);
        setUser(userData);
        
        const userSessions = await getUserSessions(currentUser.uid);
        setSessions(userSessions);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load sessions');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No study sessions yet</Text>
      <Text style={styles.emptySubtext}>Create your first session!</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* User Stats Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome, {user?.username || 'Student'}!
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user?.sessionsCompleted || 0}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user?.totalHours?.toFixed(1) || 0}h</Text>
            <Text style={styles.statLabel}>Total Hours</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user?.violations || 0}</Text>
            <Text style={styles.statLabel}>Violations</Text>
          </View>
        </View>
      </View>

      {/* Sessions List */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Your Sessions</Text>
        <FlatList
          data={sessions}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onPress={() => {
                if (item.status === 'active') {
                  router.push({ pathname: 'ActiveSessionScreen', params: { sessionId: item.id } });
                } else if (item.status === 'ended') {
                  router.push({ pathname: 'SessionReportScreen', params: { sessionId: item.id } });
                }
              }}
            />
          )}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      </View>

      {/* Create Session Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => router.push('CreateSessionScreen')}
      >
        <Text style={styles.createButtonText}>+ New Study Session</Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
  },
  listContainer: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  createButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    margin: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 15,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
  },
});

export default HomeScreen;