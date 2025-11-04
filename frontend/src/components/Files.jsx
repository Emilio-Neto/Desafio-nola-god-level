import React, { useState, useEffect } from 'react';
import { Upload, List, Button, Image, Modal, message } from 'antd';
import { UploadOutlined, DeleteOutlined, DownloadOutlined, CheckCircleOutlined } from '@ant-design/icons';

const STORAGE_KEY = 'nola_uploaded_files_v1';
const ACTIVE_LOGO_KEY = 'nola_active_logo_v1';

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const Files = ({ onUseAsLogo }) => {
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFiles(JSON.parse(raw));
    } catch (e) {
      console.warn('Failed to load uploaded files', e);
    }
  }, []);

  const persist = (next) => {
    setFiles(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
  };

  const handleUpload = async ({ file, onSuccess }) => {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const meta = {
        id: Date.now().toString(36),
        name: file.name,
        type: file.type,
        size: file.size,
        url: dataUrl,
        uploadedAt: new Date().toISOString(),
      };
      const next = [meta, ...files];
      persist(next);
      onSuccess && onSuccess(null, file);
      message.success(`${file.name} enviado`);
    } catch (e) {
      console.error(e);
      message.error('Falha ao ler o arquivo');
    }
  };

  const handleDelete = (id) => {
    const next = files.filter(f => f.id !== id);
    persist(next);
    message.success('Arquivo excluído');
  };

  const handleDownload = (f) => {
    const a = document.createElement('a');
    a.href = f.url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleUseAsLogo = (f) => {
    try {
      localStorage.setItem(ACTIVE_LOGO_KEY, f.url);
      message.success('Logo definido');
      if (typeof onUseAsLogo === 'function') onUseAsLogo(f.url);
    } catch (e) {
      message.error('Falha ao definir logo');
    }
  };

  return (
    <div>
      <h2>Gerenciador de Arquivos</h2>
      <Upload customRequest={handleUpload} showUploadList={false} accept="image/*,.csv">
        <Button icon={<UploadOutlined />}>Enviar arquivo</Button>
      </Upload>

      <List
        style={{ marginTop: 16 }}
        dataSource={files}
        bordered
        renderItem={item => (
          <List.Item
            actions={[
              <Button key="use" icon={<CheckCircleOutlined />} onClick={() => handleUseAsLogo(item)}>Usar como logo</Button>,
              <Button key="download" icon={<DownloadOutlined />} onClick={() => handleDownload(item)}>Download</Button>,
              <Button key="del" danger icon={<DeleteOutlined />} onClick={() => handleDelete(item.id)}>Excluir</Button>
            ]}
          >
            <List.Item.Meta
              avatar={item.type && item.type.startsWith('image') ? <Image width={48} src={item.url} /> : null}
              title={item.name}
              description={new Date(item.uploadedAt).toLocaleString()}
            />
          </List.Item>
        )}
      />

      <Modal visible={!!preview} footer={null} onCancel={() => setPreview(null)}>
        {preview && <Image src={preview} />}
      </Modal>
    </div>
  );
};

export default Files;
