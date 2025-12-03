'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DatabaseConnectionTest() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const testConnection = async () => {
    try {
      setStatus('loading');
      setMessage('Testing database connection...');

      const response = await fetch('/api/db-test');
      const data = await response.json();

      if (data.status === 'success') {
        setStatus('success');
      } else {
        setStatus('error');
      }
      
      setMessage(data.message);
    } catch (error: any) {
      setStatus('error');
      setMessage(`Error: ${error.message || 'Unknown error'}`);
    }
  };

  const getConnectionStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'loading':
        return <Loader2 className="h-6 w-6 animate-spin text-amber-500" />;
      default:
        return <Database className="h-6 w-6 text-gray-400" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (status) {
      case 'success':
        return 'Connected';
      case 'error':
        return 'Connection Failed';
      case 'loading':
        return 'Testing Connection...';
      default:
        return 'Not Tested';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Database Status</CardTitle>
            <CardDescription>PostgreSQL Connection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getConnectionStatusIcon()}
                <span className="font-medium">{getConnectionStatusText()}</span>
              </div>
              <Button 
                onClick={testConnection}
                disabled={status === 'loading'}
                size="sm"
              >
                {status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Database Setup</CardTitle>
            <CardDescription>Migration & Seed Status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-500">Use these commands to set up the database:</p>
              <div className="bg-gray-100 p-2 rounded text-sm font-mono">
                <div>npm run db:migrate</div>
                <div>npm run db:seed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {status !== 'idle' && (
        <Alert variant={status === 'success' ? 'default' : 'destructive'}>
          <AlertTitle>
            {status === 'success' ? 'Connection Successful' : 
             status === 'error' ? 'Connection Failed' : 
             'Testing Connection'}
          </AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
} 