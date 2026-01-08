/**
 * UserFollowingPanel Stories
 */

import React, { useState } from 'react';
import { UserFollowingPanel } from './UserFollowingPanel';

export default {
    title: 'Organisms/LinkManagerPanels/UserFollowingPanel',
    component: UserFollowingPanel,
    parameters: {
        layout: 'centered',
        backgrounds: { default: 'dark' },
        docs: {
            description: {
                component: 'Panel for following other collaborators in the workspace. Shows active users with follow/unfollow actions.',
            },
        },
    },
};

// Sample users
const sampleUsers = [
    {
        clientId: 'user-1',
        userName: 'Beth Smith',
        userColor: '#2dd4bf',
        status: 'online',
        currentViewName: 'Main Visualization',
        currentViewColor: '#2dd4bf',
    },
    {
        clientId: 'user-2',
        userName: 'Claude Opus',
        userColor: '#a78bfa',
        status: 'online',
        currentViewName: 'Analysis View',
        currentViewColor: '#a78bfa',
    },
    {
        clientId: 'user-3',
        userName: 'Alex Johnson',
        userColor: '#f472b6',
        status: 'busy',
        currentViewName: 'Detail View',
        currentViewColor: '#f472b6',
    },
    {
        clientId: 'user-4',
        userName: 'David Chen',
        userColor: '#fbbf24',
        status: 'away',
        currentViewName: 'Chart View',
        currentViewColor: '#fbbf24',
    },
];

export const Default = () => {
    const [followingUser, setFollowingUser] = useState(null);

    return (
        <UserFollowingPanel
            users={sampleUsers}
            currentUserId="user-current"
            followingUser={followingUser}
            onFollow={(user) => setFollowingUser(user)}
            onUnfollow={() => setFollowingUser(null)}
            onClose={() => console.log('Close')}
        />
    );
};

export const CurrentlyFollowing = () => {
    const [followingUser, setFollowingUser] = useState(sampleUsers[1]);

    return (
        <UserFollowingPanel
            users={sampleUsers}
            currentUserId="user-current"
            followingUser={followingUser}
            onFollow={(user) => setFollowingUser(user)}
            onUnfollow={() => setFollowingUser(null)}
            onClose={() => console.log('Close')}
        />
    );
};

export const ManyUsers = () => {
    const manyUsers = [
        ...sampleUsers,
        { clientId: 'user-5', userName: 'Emma Wilson', userColor: '#fb923c', status: 'online', currentViewName: 'Overview' },
        { clientId: 'user-6', userName: 'Frank Miller', userColor: '#22d3ee', status: 'online', currentViewName: 'Scatter Plot' },
        { clientId: 'user-7', userName: 'Grace Lee', userColor: '#4ade80', status: 'busy', currentViewName: 'Heatmap' },
        { clientId: 'user-8', userName: 'Henry Wang', userColor: '#f87171', status: 'away', currentViewName: 'Timeline' },
    ];

    const [followingUser, setFollowingUser] = useState(null);

    return (
        <UserFollowingPanel
            users={manyUsers}
            currentUserId="user-current"
            followingUser={followingUser}
            onFollow={(user) => setFollowingUser(user)}
            onUnfollow={() => setFollowingUser(null)}
            onClose={() => console.log('Close')}
        />
    );
};

export const NoUsers = () => (
    <UserFollowingPanel
        users={[]}
        currentUserId="user-current"
        onClose={() => console.log('Close')}
    />
);

export const SingleUser = () => (
    <UserFollowingPanel
        users={[sampleUsers[0]]}
        currentUserId="user-current"
        onClose={() => console.log('Close')}
    />
);

export const MixedStatuses = () => {
    const mixedUsers = [
        { clientId: 'user-1', userName: 'Online User', userColor: '#22c55e', status: 'online', currentViewName: 'Active View' },
        { clientId: 'user-2', userName: 'Busy User', userColor: '#ef4444', status: 'busy', currentViewName: 'In Meeting' },
        { clientId: 'user-3', userName: 'Away User', userColor: '#f59e0b', status: 'away', currentViewName: 'Last Active' },
        { clientId: 'user-4', userName: 'Offline User', userColor: '#6b7280', status: 'offline', currentViewName: null },
    ];

    return (
        <UserFollowingPanel
            users={mixedUsers}
            currentUserId="user-current"
            onClose={() => console.log('Close')}
        />
    );
};

export const WithoutCloseButton = () => (
    <UserFollowingPanel
        users={sampleUsers}
        currentUserId="user-current"
    />
);
