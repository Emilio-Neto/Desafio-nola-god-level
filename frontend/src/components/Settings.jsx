import React, { useState, useEffect } from 'react';
import { Form, Switch, Button, DatePicker, Input, message } from 'antd';
import { useAppStore } from '../store';

const STORAGE_KEY = 'nola_app_settings_v1';

const Settings = () => {
  const [form] = Form.useForm();
  const setDateRange = useAppStore(state => state.setDateRange);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.defaultDateRange) {
          form.setFieldValue('defaultDateRange', parsed.defaultDateRange.map(d => d ? d : null));
        }
        form.setFieldValue('themeDark', !!parsed.themeDark);
        form.setFieldValue('accent', parsed.accent || '#fd6263');
      }
    } catch (e) {
      // ignorar
    }
  }, [form]);

  const onFinish = (values) => {
    try {
      const payload = {
        themeDark: !!values.themeDark,
        accent: values.accent || '#fd6263',
        defaultDateRange: values.defaultDateRange || [null, null],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      // aplica o dateRange padrão ao store para que o dashboard passe a usar imediatamente
      if (Array.isArray(payload.defaultDateRange) && payload.defaultDateRange[0] && payload.defaultDateRange[1]) {
        setDateRange(payload.defaultDateRange);
      }
      message.success('Configurações salvas');
    } catch (e) {
      console.error(e);
      message.error('Falha ao salvar configurações');
    }
  };

  return (
    <div>
      <h2>Configurações</h2>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ accent: '#fd6263' }}>
        <Form.Item name="themeDark" label="Tema escuro" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="accent" label="Cor de destaque">
          <Input type="color" />
        </Form.Item>

        <Form.Item name="defaultDateRange" label="Data padrão (Range)">
          <DatePicker.RangePicker />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">Salvar</Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Settings;
