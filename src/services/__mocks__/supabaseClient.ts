export const supabase = {
    from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: [], error: null }),
        update: () => ({ data: [], error: null }),
        delete: () => ({ data: [], error: null }),
        eq: () => ({ data: [], error: null }),
        order: () => ({ limit: () => ({ data: [], error: null }) }),
        on: () => ({ subscribe: () => {} }),
    }),
    auth: {
        signInWithPassword: () => Promise.resolve({ data: { user: { id: '123' } }, error: null }),
        signUp: () => Promise.resolve({ data: { user: { id: '123' } }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        getUser: () => Promise.resolve({ data: { user: { id: '123', email: 'test@example.com' } }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        resetPasswordForEmail: () => Promise.resolve({ error: null }),
    },
    channel: () => ({
        on: () => ({ subscribe: () => {} }),
    }),
    removeChannel: () => {},
    storage: {
        from: () => ({
            upload: () => Promise.resolve({ data: { path: 'path' }, error: null }),
            getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/image.png' } }),
        })
    }
};

export const getErrorMessage = (err: any) => err?.message || 'Error occurred';
