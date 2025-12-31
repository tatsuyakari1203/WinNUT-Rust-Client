import { useState, useCallback } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'ready' | 'error' | 'uptodate';

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [updateObj, setUpdateObj] = useState<Update | null>(null);

  const checkUpdate = useCallback(async () => {
    setStatus('checking');
    setError(null);
    try {
      const update = await check();
      if (update && update.available) {
        setUpdateObj(update);
        setNewVersion(update.version);
        setStatus('available');
        console.log(`Update ${update.version} available`);
      } else {
        setStatus('uptodate');
        console.log("App is up to date");
      }
    } catch (e) {
      console.error('Update check failed:', e);
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!updateObj) return;

    setStatus('downloading');
    setProgress(0);
    try {
      let downloaded = 0;
      let contentLength = 0;

      await updateObj.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            console.log(`Download started. Size: ${contentLength}`);
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              const pct = Math.round((downloaded / contentLength) * 100);
              setProgress(pct);
            }
            break;
          case 'Finished':
            console.log('Download finished');
            setStatus('installing');
            break;
        }
      });

      console.log('Update installed');
      setStatus('ready');

      // Prompt user or auto-restart
      // await relaunch();
    } catch (e) {
      console.error('Install failed:', e);
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [updateObj]);

  const restartApp = useCallback(async () => {
    try {
      await relaunch();
    } catch (e) {
      console.error("Failed to relaunch:", e);
    }
  }, []);

  return { status, error, progress, newVersion, checkUpdate, installUpdate, restartApp };
}
