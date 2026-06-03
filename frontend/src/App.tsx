import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { Layout } from './components/Layout/Layout';

export default function App() {
  const fetchLibraries = useAppStore(s => s.fetchLibraries);
  const fetchLiterature = useAppStore(s => s.fetchLiterature);
  const fetchTags = useAppStore(s => s.fetchTags);
  const fetchWritingStyles = useAppStore(s => s.fetchWritingStyles);

  useEffect(() => {
    fetchLibraries();
    fetchLiterature();
    fetchTags();
    fetchWritingStyles();
  }, []);

  return <Layout />;
}