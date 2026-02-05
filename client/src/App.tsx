import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import {
  VscFiles,
  VscSearch,
  VscSourceControl,
  VscDebugAlt,
  VscExtensions,
  VscAccount,
  VscSettingsGear,
  VscRemote,
  VscNewFile,
  VscNewFolder,
  VscCloudUpload,
  VscTrash,
  VscFolder,
  VscFolderOpened,
  VscChevronRight,
  VscChevronDown,
  VscFolderLibrary,
  VscClose,
} from 'react-icons/vsc';
import { DiJavascript1, DiCss3, DiReact, DiMarkdown } from 'react-icons/di';
import { AiFillFileText } from 'react-icons/ai';
import ProfileModal from './components/ProfileModal';
import FileViewerModal from './components/FileViewerModal';
import './App.css';

interface FileData {
  id: number;
  name: string;
  content: string;
  language: string;
}

type CreateItem = { type: 'file' | 'folder'; parentPath: string | null } | null;

type FolderNode = {
  type: 'folder';
  name: string;
  path: string;
  children: TreeNode[];
  childMap: Map<string, TreeNode>;
};

type TreeNode =
  | FolderNode
  | { type: 'file'; name: string; path: string; file: FileData };

function App() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewerFile, setViewerFile] = useState<FileData | null>(null);
  const activeFileIdRef = useRef<number | null>(null);
  const isDirtyRef = useRef(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<FileData[]>([]);
  const [editedContent, setEditedContent] = useState<Record<number, string>>({});
  const [creatingItem, setCreatingItem] = useState<CreateItem>(null);
  const [newItemName, setNewItemName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [profile, setProfile] = useState({
    name: 'Carlos Gonzalez',
    title: 'Full Stack Developer',
    bio: 'Construyo experiencias web con foco en producto, rendimiento y DX.',
    location: 'Chile',
    email: 'carlos@email.com',
    website: 'https://carlos.dev',
    github: 'https://github.com/carlos',
    linkedin: 'https://linkedin.com/in/carlos',
    avatarUrl: '',
  });
  const [renamingItem, setRenamingItem] = useState<{
    type: 'file' | 'folder';
    path: string;
    fileId?: number;
  } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const newItemInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const didInitExpandRef = useRef(false);

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedAdmin = localStorage.getItem('is_admin') === 'true';
    if (storedToken) {
      setToken(storedToken);
      setIsAdmin(storedAdmin);
      axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
    }

    const fetchFiles = async () => {
      try {
        const response = await axios.get(`${apiBaseUrl}/api/files`);
        setFiles(response.data);
        if (response.data.length > 0) setActiveFileId(response.data[0].id);
      } catch (error) {
        console.error('Error backend:', error);
      } finally {
        setLoading(false);
      }
    };
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${apiBaseUrl}/api/profile`);
        const data = response.data;
        setProfile({
          name: data.name,
          title: data.title,
          bio: data.bio,
          location: data.location,
          email: data.email,
          website: data.website,
          github: data.github,
          linkedin: data.linkedin,
          avatarUrl: data.avatar_data || '',
        });
      } catch (error) {
        console.error('Error profile:', error);
      }
    };
    fetchFiles();
    fetchProfile();
  }, [apiBaseUrl]);

  const handleLogin = async (username: string, password: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const response = await axios.post(`${apiBaseUrl}/api/auth/login`, { username, password });
      const nextToken = response.data?.token as string | undefined;
      const nextIsAdmin = Boolean(response.data?.user?.isAdmin);
      if (!nextToken) {
        setLoginError('Respuesta invalida del servidor');
        return;
      }

      localStorage.setItem('auth_token', nextToken);
      localStorage.setItem('is_admin', String(nextIsAdmin));
      setToken(nextToken);
      setIsAdmin(nextIsAdmin);
      axios.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
      setIsProfileOpen(false);
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Credenciales invalidas');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('is_admin');
    delete axios.defaults.headers.common.Authorization;
    setToken(null);
    setIsAdmin(false);
  };

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseEvent.clientX - 50;
        if (newWidth > 100 && newWidth < 600) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const activeFile = files.find((f) => f.id === activeFileId) || null;

  const isPdfFile = (file: FileData) =>
    file.language === 'pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImageFile = (file: FileData) =>
    file.language === 'image' || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(file.name);
  const isVideoFile = (file: FileData) =>
    file.language === 'video' || /\.(mp4|webm|ogg)$/i.test(file.name);
  const isAudioFile = (file: FileData) =>
    file.language === 'audio' || /\.(mp3|wav|ogg)$/i.test(file.name);
  const isOfficeFile = (file: FileData) =>
    file.language === 'office' || /\.(docx|xlsx|pptx)$/i.test(file.name);

  const isDirty = Boolean(
    activeFile &&
      !isPdfFile(activeFile) &&
      editedContent[activeFile.id] !== undefined &&
      editedContent[activeFile.id] !== (activeFile.content || '')
  );

  const buildTree = (items: FileData[]) => {
    const root: FolderNode = {
      type: 'folder',
      name: '',
      path: '',
      children: [],
      childMap: new Map(),
    };

    for (const file of items) {
      if (file.name.endsWith('/.folder')) {
        const folderPath = file.name.replace('/.folder', '');
        const parts = folderPath.split('/').filter(Boolean);
        let current = root;
        let currentPath = '';
        for (let index = 0; index < parts.length; index += 1) {
          const part = parts[index];
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          let folder = current.childMap.get(currentPath) as FolderNode | undefined;
          if (!folder || folder.type !== 'folder') {
            folder = {
              type: 'folder',
              name: part,
              path: currentPath,
              children: [],
              childMap: new Map(),
            };
            current.childMap.set(currentPath, folder);
          }
          current = folder;
        }
        continue;
      }

      const parts = file.name.split('/').filter(Boolean);
      let current = root;
      let currentPath = '';

      for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index];
        const isLast = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (isLast) {
          if (!current.childMap.has(currentPath)) {
            current.childMap.set(currentPath, {
              type: 'file',
              name: part,
              path: currentPath,
              file,
            });
          }
        } else {
          let folder = current.childMap.get(currentPath) as FolderNode | undefined;
          if (!folder || folder.type !== 'folder') {
            folder = {
              type: 'folder',
              name: part,
              path: currentPath,
              children: [],
              childMap: new Map(),
            };
            current.childMap.set(currentPath, folder);
          }
          current = folder;
        }
      }
    }

    const normalize = (node: TreeNode): TreeNode => {
      if (node.type === 'folder') {
        node.children = Array.from(node.childMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(normalize);
      }
      return node;
    };

    const normalized = normalize(root) as FolderNode;
    return normalized.children;
  };

  const tree = buildTree(files);

  const existingNamesLower = files.map((file) => file.name.trim().toLowerCase());

  const existingFolders = (() => {
    const set = new Set<string>();
    for (const file of files) {
      if (file.name.endsWith('/.folder')) {
        set.add(file.name.replace('/.folder', ''));
        continue;
      }
      const parts = file.name.split('/').filter(Boolean);
      if (parts.length > 1) {
        parts.pop();
        set.add(parts.join('/'));
      }
    }
    return Array.from(set.values());
  })();

  useEffect(() => {
    if (!didInitExpandRef.current) {
      const allFolders: string[] = [];
      const walk = (nodes: TreeNode[]) => {
        for (const node of nodes) {
          if (node.type === 'folder') {
            allFolders.push(node.path);
            walk(node.children);
          }
        }
      };
      walk(tree);
      setExpandedFolders(new Set(allFolders));
      didInitExpandRef.current = true;
    }
  }, [tree]);

  const toggleFolder = (path: string) => {
    setSelectedFolderPath(path);
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  useEffect(() => {
    activeFileIdRef.current = activeFileId;
    isDirtyRef.current = isDirty;
  }, [activeFileId, isDirty]);

  useEffect(() => {
    const wsUrl = apiBaseUrl.replace(/^http/, 'ws') + '/ws';
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type: string; payload?: FileData | { id: number } };
        if (data.type === 'file.created' && data.payload && 'id' in data.payload) {
          const created = data.payload as FileData;
          setFiles((prev) => {
            if (prev.some((file) => file.id === created.id)) return prev;
            const next = [...prev, created];
            next.sort((a, b) => a.name.localeCompare(b.name));
            return next;
          });
        }
        if (data.type === 'file.updated' && data.payload && 'id' in data.payload) {
          const updated = data.payload as FileData;
          setFiles((prev) => prev.map((file) => (file.id === updated.id ? updated : file)));
          setOpenTabs((prev) => prev.map((tab) => (tab.id === updated.id ? updated : tab)));
          if (activeFileIdRef.current === updated.id) {
            if (!isDirtyRef.current) {
              setEditorContent(updated.content || '');
              setEditedContent((prev) => ({ ...prev, [updated.id]: updated.content || '' }));
            } else {
              setSaveStatus('Cambios remotos disponibles');
              setTimeout(() => setSaveStatus(null), 3000);
            }
          }
        }
        if (data.type === 'file.deleted' && data.payload && 'id' in data.payload) {
          const deleted = data.payload as { id: number };
          setFiles((prev) => prev.filter((file) => file.id !== deleted.id));
          setOpenTabs((prev) => prev.filter((tab) => tab.id !== deleted.id));
          if (activeFileIdRef.current === deleted.id) {
            setActiveFileId(null);
            setViewerFile(null);
          }
        }
      } catch (error) {
        console.error('WS parse error:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WS error:', error);
    };

    return () => socket.close();
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!activeFile) {
      setEditorContent('');
      return;
    }
    const current = editedContent[activeFile.id];
    if (current !== undefined) {
      setEditorContent(current);
    } else {
      setEditorContent(activeFile.content || '');
      setEditedContent((prev) => ({ ...prev, [activeFile.id]: activeFile.content || '' }));
    }
  }, [activeFileId, activeFile, editedContent]);

  useEffect(() => {
    if (activeFile && !openTabs.some((tab) => tab.id === activeFile.id)) {
      setOpenTabs((prev) => [...prev, activeFile]);
    }
  }, [activeFile, openTabs]);

  useEffect(() => {
    if (creatingItem && newItemInputRef.current) {
      newItemInputRef.current.focus();
      newItemInputRef.current.select();
    }
  }, [creatingItem]);

  useEffect(() => {
    if (renamingItem && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingItem]);

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return <DiReact color="#61dafb" />;
    if (filename.endsWith('.css')) return <DiCss3 color="#42a5f5" />;
    if (filename.endsWith('.js')) return <DiJavascript1 color="#fdd835" />;
    if (filename.endsWith('.md')) return <DiMarkdown color="#b3b3b3" />;
    return <AiFillFileText color="#ccc" />;
  };

  const saveFile = useCallback(async () => {
    if (!activeFile || !isAdmin || !token) return;
    if (isPdfFile(activeFile) || isImageFile(activeFile) || isVideoFile(activeFile) || isAudioFile(activeFile)) return;
    setIsSaving(true);
    setSaveStatus('Guardando...');
    try {
      const response = await axios.put(
        `${apiBaseUrl}/api/files/${activeFile.id}`,
        { content: editorContent }
      );
      setFiles((prev) =>
        prev.map((file) => (file.id === activeFile.id ? response.data : file))
      );
      setOpenTabs((prev) => prev.map((tab) => (tab.id === activeFile.id ? response.data : tab)));
      setEditedContent((prev) => ({ ...prev, [activeFile.id]: response.data.content || '' }));
      setSaveStatus('Guardado');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('Error al guardar:', error);
      setSaveStatus('Error al guardar');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [activeFile, apiBaseUrl, editorContent, isAdmin, token]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const isSaveCombo = (isMac ? event.metaKey : event.ctrlKey) && event.key.toLowerCase() === 's';
      if (isSaveCombo) {
        event.preventDefault();
        void saveFile();
      }
      if (event.key === 'Escape' && creatingItem) {
        setCreatingItem(null);
        setNewItemName('');
      }
      if (event.key === 'Enter' && creatingItem) {
        event.preventDefault();
        void commitCreate();
      }
      if (event.key === 'F2') {
        event.preventDefault();
        if (selectedFileId) {
          const file = files.find((f) => f.id === selectedFileId);
          if (file) {
            setRenamingItem({ type: 'file', path: file.name, fileId: file.id });
            setRenameValue(file.name.split('/').pop() || file.name);
          }
        } else if (selectedFolderPath) {
          setRenamingItem({ type: 'folder', path: selectedFolderPath });
          setRenameValue(selectedFolderPath.split('/').pop() || selectedFolderPath);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveFile, creatingItem, selectedFileId, selectedFolderPath, files]);

  const openTab = (file: FileData) => {
    setOpenTabs((prev) => (prev.some((t) => t.id === file.id) ? prev : [...prev, file]));
    setActiveFileId(file.id);
  };

  const closeTab = (fileId: number) => {
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.id !== fileId);
      if (activeFileId === fileId) {
        setActiveFileId(next.length ? next[next.length - 1].id : null);
      }
      return next;
    });
    setEditedContent((prev) => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  };

  const handleOpenFile = (file: FileData) => {
    openTab(file);
    const parentPath = file.name.includes('/') ? file.name.split('/').slice(0, -1).join('/') : null;
    setSelectedFolderPath(parentPath || null);
    setSelectedFileId(file.id);
    if (isPdfFile(file) || isImageFile(file) || isVideoFile(file) || isAudioFile(file) || isOfficeFile(file)) {
      setViewerFile(file);
    } else {
      setViewerFile(null);
    }
  };

  const handleCreateCodeFile = async (name: string) => {
    const response = await axios.post(`${apiBaseUrl}/api/files`, { name, content: '' });
    const created = response.data as FileData;
    setFiles((prev) => {
      const next = [...prev, created];
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
    openTab(created);
  };

  const handleCreateFolder = async (name: string) => {
    const folderPath = `${name}/.folder`;
    const response = await axios.post(`${apiBaseUrl}/api/files`, { name: folderPath, content: '' });
    const created = response.data as FileData;
    setFiles((prev) => {
      const next = [...prev, created];
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
    setExpandedFolders((prev) => new Set(prev).add(name));
  };

  const commitCreate = async () => {
    if (!creatingItem) return;
    const name = newItemName.trim();
    if (!name) {
      setCreatingItem(null);
      return;
    }
    const fullName = creatingItem.parentPath ? `${creatingItem.parentPath}/${name}` : name;

    if (creatingItem.type === 'file') {
      if (existingNamesLower.includes(fullName.toLowerCase())) {
        setSaveStatus('Ya existe un archivo con ese nombre');
        setTimeout(() => setSaveStatus(null), 3000);
        return;
      }
      try {
        await handleCreateCodeFile(fullName);
        setCreatingItem(null);
        setNewItemName('');
      } catch (error) {
        console.error('Error al crear:', error);
        setSaveStatus('Error al crear archivo');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } else {
      const lowerFolders = existingFolders.map((folder) => folder.toLowerCase());
      if (lowerFolders.includes(fullName.toLowerCase())) {
        setSaveStatus('Ya existe una carpeta con ese nombre');
        setTimeout(() => setSaveStatus(null), 3000);
        return;
      }
      try {
        await handleCreateFolder(fullName);
        setCreatingItem(null);
        setNewItemName('');
      } catch (error) {
        console.error('Error al crear carpeta:', error);
        setSaveStatus('Error al crear carpeta');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    }
  };

  const startCreateFile = () => {
    if (!isAdmin || !token) {
      setIsProfileOpen(true);
      return;
    }
    setCreatingItem({ type: 'file', parentPath: selectedFolderPath });
    setNewItemName('');
  };

  const startCreateFolder = () => {
    if (!isAdmin || !token) {
      setIsProfileOpen(true);
      return;
    }
    setCreatingItem({ type: 'folder', parentPath: selectedFolderPath });
    setNewItemName('');
  };

  const handleUploadClick = () => {
    if (!isAdmin || !token) {
      setIsProfileOpen(true);
      return;
    }
    uploadInputRef.current?.click();
  };

  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedFolderPath) {
        formData.append('path', selectedFolderPath);
      }
      const response = await axios.post(`${apiBaseUrl}/api/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const created = response.data as FileData;
      setFiles((prev) => {
        const next = [...prev, created];
        next.sort((a, b) => a.name.localeCompare(b.name));
        return next;
      });
      openTab(created);
      if (isPdfFile(created) || isImageFile(created) || isVideoFile(created) || isAudioFile(created) || isOfficeFile(created)) {
        setViewerFile(created);
      }
    } catch (error) {
      console.error('Error al subir:', error);
      setSaveStatus('Error al subir archivo');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (file: FileData) => {
    if (!isAdmin || !token) return;
    const confirmed = window.confirm(`Eliminar ${file.name}?`);
    if (!confirmed) return;

    try {
      await axios.delete(`${apiBaseUrl}/api/files/${file.id}`);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      setOpenTabs((prev) => prev.filter((t) => t.id !== file.id));
      if (activeFileId === file.id) {
        setActiveFileId(null);
        setViewerFile(null);
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      setSaveStatus('Error al eliminar');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const moveFile = async (fileToMove: FileData, folderPath?: string) => {
    const baseName = fileToMove.name.split('/').pop() || fileToMove.name;
    const newName = folderPath ? `${folderPath}/${baseName}` : baseName;
    if (newName === fileToMove.name) return;
    await axios.put(`${apiBaseUrl}/api/files/${fileToMove.id}`, {
      name: newName,
      content: fileToMove.content,
    });
  };

  const commitRename = async () => {
    if (!renamingItem) return;
    const name = renameValue.trim();
    if (!name) {
      setRenamingItem(null);
      return;
    }

    if (renamingItem.type === 'file' && renamingItem.fileId) {
      const file = files.find((f) => f.id === renamingItem.fileId);
      if (!file) return;
      const parentPath = file.name.includes('/') ? file.name.split('/').slice(0, -1).join('/') : '';
      const newName = parentPath ? `${parentPath}/${name}` : name;
      if (existingNamesLower.includes(newName.toLowerCase())) {
        setSaveStatus('Ya existe un archivo con ese nombre');
        setTimeout(() => setSaveStatus(null), 3000);
        return;
      }
      await axios.put(`${apiBaseUrl}/api/files/${file.id}`, {
        name: newName,
        content: file.content,
      });
      setRenamingItem(null);
      setRenameValue('');
      return;
    }

    if (renamingItem.type === 'folder') {
      const oldPath = renamingItem.path;
      const parentPath = oldPath.includes('/') ? oldPath.split('/').slice(0, -1).join('/') : '';
      const newPath = parentPath ? `${parentPath}/${name}` : name;
      if (existingFolders.map((f) => f.toLowerCase()).includes(newPath.toLowerCase())) {
        setSaveStatus('Ya existe una carpeta con ese nombre');
        setTimeout(() => setSaveStatus(null), 3000);
        return;
      }
      const toRename = files.filter((f) => f.name === `${oldPath}/.folder` || f.name.startsWith(`${oldPath}/`));
      for (const file of toRename) {
        const updatedName = file.name.replace(oldPath, newPath);
        await axios.put(`${apiBaseUrl}/api/files/${file.id}`, {
          name: updatedName,
          content: file.content,
        });
      }
      setSelectedFolderPath(newPath);
      setRenamingItem(null);
      setRenameValue('');
    }
  };

  const handleDeleteFolder = async (folderPath: string) => {
    if (!isAdmin || !token) return;
    const confirmed = window.confirm(`Eliminar carpeta ${folderPath} y todo su contenido?`);
    if (!confirmed) return;
    const toDelete = files.filter((f) => f.name === `${folderPath}/.folder` || f.name.startsWith(`${folderPath}/`));
    try {
      for (const file of toDelete) {
        await axios.delete(`${apiBaseUrl}/api/files/${file.id}`);
      }
    } catch (error) {
      console.error('Error al eliminar carpeta:', error);
      setSaveStatus('Error al eliminar carpeta');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const getFolderIcon = (name: string, isOpen: boolean) => {
    const lower = name.toLowerCase();
    const color =
      lower === 'img' || lower === 'images' ? '#f48fb1' :
      lower === 'js' || lower === 'javascript' ? '#fdd835' :
      lower === 'ts' || lower === 'typescript' ? '#64b5f6' :
      lower === 'css' ? '#42a5f5' :
      lower === 'assets' ? '#b39ddb' :
      '#c6c6c6';
    const Icon = isOpen ? VscFolderOpened : VscFolder;
    return <Icon color={color} />;
  };

  if (loading) return <div style={{ color: 'white', padding: 20 }}>Cargando entorno...</div>;

  return (
    <div className="ide-container">
      <aside className="activity-bar">
        <div className="icon-container active"><VscFiles /></div>
        <div className="icon-container"><VscFolderLibrary /></div>
        <div className="icon-container"><VscSearch /></div>
        <div className="icon-container"><VscSourceControl /></div>
        <div className="icon-container"><VscDebugAlt /></div>
        <div className="icon-container"><VscExtensions /></div>
        <div style={{ flex: 1 }}></div>
        <div
          className={`icon-container ${isAdmin ? 'admin-active' : ''}`}
          title={isAdmin ? 'Admin conectado' : 'Iniciar sesion'}
          onClick={() => setIsProfileOpen(true)}
        >
          <VscAccount />
        </div>
        <div className="icon-container"><VscSettingsGear /></div>
      </aside>

      <aside
        className="sidebar"
        ref={sidebarRef}
        style={{ width: sidebarWidth }}
      >
        <div className="sidebar-title">EXPLORADOR</div>
        <div
          className="sidebar-title sidebar-header"
          onClick={() => {
            setSelectedFolderPath(null);
            setSelectedFileId(null);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const fileId = Number(event.dataTransfer.getData('text/plain'));
            const fileToMove = files.find((f) => f.id === fileId);
            if (!fileToMove) return;
            if (fileToMove.name.endsWith('/.folder')) return;
            void moveFile(fileToMove);
          }}
        >
          <span style={{ fontSize: '10px' }}>PORTAFOLIO-CARLOS</span>
          <div className="sidebar-actions">
            <button
              className="new-file-button"
              onClick={startCreateFile}
              title="Nuevo archivo"
              disabled={!isAdmin}
            >
              <VscNewFile />
            </button>
            <button
              className="new-file-button"
              onClick={startCreateFolder}
              title="Nueva carpeta"
              disabled={!isAdmin}
            >
              <VscNewFolder />
            </button>
            <button
              className="new-file-button"
              onClick={handleUploadClick}
              title="Subir archivo"
              disabled={!isAdmin || isUploading}
            >
              <VscCloudUpload />
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) {
                  void handleUploadFile(selected);
                }
                event.currentTarget.value = '';
              }}
            />
          </div>
        </div>
        <div className="file-tree">
          {creatingItem && !creatingItem.parentPath && (
            <div className="file-item creating-item" style={{ paddingLeft: 12 }}>
              <div className="file-label">
                {creatingItem.type === 'folder' ? <VscFolder /> : <AiFillFileText color="#ccc" />}
                <input
                  ref={newItemInputRef}
                  className="new-item-input"
                  value={newItemName}
                  onChange={(event) => setNewItemName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void commitCreate();
                    }
                    if (event.key === 'Escape') {
                      setCreatingItem(null);
                      setNewItemName('');
                    }
                  }}
                  onBlur={() => {
                    setCreatingItem(null);
                    setNewItemName('');
                  }}
                  placeholder={creatingItem.type === 'folder' ? 'Nueva carpeta' : 'Nuevo archivo'}
                />
              </div>
            </div>
          )}
          {tree.map((node) => {
            const renderNode = (item: TreeNode, depth: number) => {
              if (item.type === 'folder') {
                const isOpen = expandedFolders.has(item.path);
                const isSelected = selectedFolderPath === item.path;
                return (
                  <div key={item.path}>
                    <div
                      className={`file-item folder-item ${dragOverFolder === item.path ? 'drag-over' : ''} ${isSelected ? 'selected' : ''}`}
                      style={{ paddingLeft: 12 + depth * 12 }}
                      onClick={() => {
                        toggleFolder(item.path);
                        setSelectedFolderPath(item.path);
                        setSelectedFileId(null);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOverFolder(item.path);
                      }}
                      onDragLeave={() => setDragOverFolder(null)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDragOverFolder(null);
                        const fileId = Number(event.dataTransfer.getData('text/plain'));
                        const fileToMove = files.find((f) => f.id === fileId);
                        if (!fileToMove) return;
                        if (fileToMove.name.endsWith('/.folder')) return;
                        void moveFile(fileToMove, item.path);
                      }}
                    >
                      <div className="file-label">
                        {isOpen ? <VscChevronDown /> : <VscChevronRight />}
                        {getFolderIcon(item.name, isOpen)}
                        {renamingItem?.type === 'folder' && renamingItem.path === item.path ? (
                          <input
                            ref={renameInputRef}
                            className="new-item-input"
                            value={renameValue}
                            onChange={(event) => setRenameValue(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                void commitRename();
                              }
                              if (event.key === 'Escape') {
                                setRenamingItem(null);
                                setRenameValue('');
                              }
                            }}
                            onBlur={() => {
                              setRenamingItem(null);
                              setRenameValue('');
                            }}
                          />
                        ) : (
                          <span>{item.name}</span>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="file-actions">
                          <button
                            className="file-delete"
                            title="Eliminar carpeta"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDeleteFolder(item.path);
                            }}
                          >
                            <VscTrash />
                          </button>
                        </div>
                      )}
                    </div>
                    {isOpen && creatingItem?.parentPath === item.path && (
                      <div className="file-item creating-item" style={{ paddingLeft: 12 + (depth + 1) * 12 }}>
                        <div className="file-label">
                          {creatingItem.type === 'folder' ? <VscFolder /> : <AiFillFileText color="#ccc" />}
                          <input
                            ref={newItemInputRef}
                            className="new-item-input"
                            value={newItemName}
                            onChange={(event) => setNewItemName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                void commitCreate();
                              }
                              if (event.key === 'Escape') {
                                setCreatingItem(null);
                                setNewItemName('');
                              }
                            }}
                            onBlur={() => {
                              setCreatingItem(null);
                              setNewItemName('');
                            }}
                            placeholder={creatingItem.type === 'folder' ? 'Nueva carpeta' : 'Nuevo archivo'}
                          />
                        </div>
                      </div>
                    )}
                    {isOpen && item.children.map((child) => renderNode(child, depth + 1))}
                  </div>
                );
              }

              const file = item.file;
              const isSelectedFile = selectedFileId === file.id;
              return (
                <div
                  key={file.id}
                  className={`file-item ${activeFileId === file.id ? 'active' : ''} ${isSelectedFile ? 'selected' : ''}`}
                  style={{ paddingLeft: 12 + depth * 12 }}
                  onClick={() => handleOpenFile(file)}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', String(file.id));
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                >
                  <div className="file-label">
                    {getFileIcon(file.name)}
                    {renamingItem?.type === 'file' && renamingItem.fileId === file.id ? (
                      <input
                        ref={renameInputRef}
                        className="new-item-input"
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void commitRename();
                          }
                          if (event.key === 'Escape') {
                            setRenamingItem(null);
                            setRenameValue('');
                          }
                        }}
                        onBlur={() => {
                          setRenamingItem(null);
                          setRenameValue('');
                        }}
                      />
                    ) : (
                      <span>{item.name}</span>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="file-actions">
                      <button
                        className="file-delete"
                        title="Eliminar"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteFile(file);
                        }}
                      >
                        <VscTrash />
                      </button>
                    </div>
                  )}
                </div>
              );
            };

            return renderNode(node, 0);
          })}
        </div>
      </aside>

      <div
        className="resizer"
        onMouseDown={startResizing}
      />

      <main className="editor-wrapper">
        <div className="breadcrumb-bar">
          {selectedFolderPath ? (
            selectedFolderPath.split('/').map((segment, index, arr) => (
              <span key={`${segment}-${index}`}>
                {segment}
                {index < arr.length - 1 && <span className="breadcrumb-sep">/</span>}
              </span>
            ))
          ) : (
            <span>ROOT</span>
          )}
        </div>
        <div className="tabs-bar">
          {openTabs.map((tab) => {
            const tabDirty =
              editedContent[tab.id] !== undefined &&
              editedContent[tab.id] !== (tab.content || '');
            return (
              <div
                key={tab.id}
                className={`tab ${activeFileId === tab.id ? 'active' : ''}`}
                onClick={() => handleOpenFile(tab)}
              >
                {getFileIcon(tab.name)} {tab.name}
                {tabDirty && <span className="tab-indicator">●</span>}
                <button
                  className="tab-close"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <VscClose />
                </button>
              </div>
            );
          })}
        </div>
        <div className="monaco-container">
          {activeFile && (isPdfFile(activeFile) || isImageFile(activeFile) || isVideoFile(activeFile) || isAudioFile(activeFile) || isOfficeFile(activeFile)) ? (
            <div className="pdf-placeholder">
              Vista previa abierta en modal.
            </div>
          ) : (
            <Editor
              height="calc(100vh - 22px)"
              language={activeFile?.language || 'markdown'}
              theme="vs-dark"
              value={editorContent}
              onChange={(value) => {
                const nextValue = value ?? '';
                setEditorContent(nextValue);
                if (activeFile) {
                  setEditedContent((prev) => ({ ...prev, [activeFile.id]: nextValue }));
                }
              }}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                fontFamily: 'Fira Code, Consolas, monospace',
                readOnly: !isAdmin,
                automaticLayout: true,
              }}
            />
          )}
        </div>
      </main>

      <footer className="status-bar">
        <div style={{ display: 'flex', gap: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><VscRemote /> WSL: Ubuntu</div>
          <div>main*</div>
        </div>
        <div style={{ display: 'flex', gap: 15 }}>
          <div>Ln 12, Col 45</div>
          <div>UTF-8</div>
          <div>TypeScript React</div>
          <div>Prettier</div>
          {saveStatus && <div>{isSaving ? 'Guardando...' : saveStatus}</div>}
        </div>
      </footer>

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        isAdmin={isAdmin}
        onLogin={handleLogin}
        onLogout={handleLogout}
        loginError={loginError}
        loginLoading={loginLoading}
        profile={profile}
        onSaveProfile={async (next) => {
          setProfile(next);
          try {
            const response = await axios.put(`${apiBaseUrl}/api/profile`, {
              name: next.name,
              title: next.title,
              bio: next.bio,
              location: next.location,
              email: next.email,
              website: next.website,
              github: next.github,
              linkedin: next.linkedin,
              avatar_data: next.avatarUrl,
            });
            const data = response.data;
            setProfile({
              name: data.name,
              title: data.title,
              bio: data.bio,
              location: data.location,
              email: data.email,
              website: data.website,
              github: data.github,
              linkedin: data.linkedin,
              avatarUrl: data.avatar_data || '',
            });
          } catch (error) {
            console.error('Error guardando perfil:', error);
          }
        }}
      />

      {viewerFile && (
        <FileViewerModal
          isOpen={Boolean(viewerFile)}
          onClose={() => setViewerFile(null)}
          file={viewerFile}
          apiBaseUrl={apiBaseUrl}
        />
      )}
    </div>
  );
}

export default App;
