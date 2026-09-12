import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';

export default function AudioController() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const {
    currentEpisode,
    isPlaying,
    playbackRate,
    volume,
    setIsPlaying,
    setIsLoadingAudio,
    setProgress,
    setDuration,
    next,
  } = usePlayerStore();

  const previousAudioUrlRef = useRef<string | null>(null);

  const getCleanUrl = (rawUrl?: string) => {
    if (!rawUrl) return '';
    let direct = rawUrl;
    if (direct.includes("https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net")) {
      const match = direct.match(/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F([^&]+)/);
      if (match) {
        direct = "https://d3ctxlq1ktw2nl.cloudfront.net/staging/" + decodeURIComponent(match[1]);
      }
    }
    return direct;
  };

  const directAudioUrl = getCleanUrl(currentEpisode?.audioUrl);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!directAudioUrl) {
      audio.removeAttribute('src');
      previousAudioUrlRef.current = null;
      return;
    }

    if (previousAudioUrlRef.current !== directAudioUrl) {
      previousAudioUrlRef.current = directAudioUrl;
      audio.src = directAudioUrl;
      audio.playbackRate = playbackRate;
      audio.volume = volume;
    }

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsLoadingAudio(false);
          })
          .catch((err) => {
            console.warn('Playback error:', err.message);
            setIsPlaying(false);
            setIsLoadingAudio(false);
          });
      }
    } else {
      audio.pause();
    }
  }, [directAudioUrl, isPlaying, playbackRate, volume, setIsPlaying, setIsLoadingAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackRate;
      audio.volume = volume;
    }
  }, [playbackRate, volume]);

  return (
    <audio
      ref={audioRef}
      id="global-podcast-audio"
      playsInline
      preload="auto"
      onLoadStart={() => setIsLoadingAudio(true)}
      onLoadedMetadata={(e) => {
        const target = e.currentTarget;
        if (target.duration && !isNaN(target.duration) && isFinite(target.duration)) {
          setDuration(target.duration);
        }
        setIsLoadingAudio(false);
      }}
      onDurationChange={(e) => {
        const target = e.currentTarget;
        if (target.duration && !isNaN(target.duration) && isFinite(target.duration)) {
          setDuration(target.duration);
        }
      }}
      onCanPlay={() => setIsLoadingAudio(false)}
      onPlaying={() => {
        setIsPlaying(true);
        setIsLoadingAudio(false);
      }}
      onPause={() => setIsPlaying(false)}
      onWaiting={() => setIsLoadingAudio(true)}
      onTimeUpdate={(e) => {
        setProgress(e.currentTarget.currentTime);
      }}
      onEnded={() => {
        setIsPlaying(false);
        setIsLoadingAudio(false);
        next();
      }}
      onError={(e) => {
        const target = e.currentTarget;
        console.warn('Native audio error code:', target.error?.code, target.error?.message);
        setIsLoadingAudio(false);
        setIsPlaying(false);
      }}
      style={{ display: 'none' }}
    />
  );
}
