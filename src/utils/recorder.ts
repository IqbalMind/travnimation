import * as Muxer from 'mp4-muxer';

export class VideoExporter {
  private muxer: Muxer.Muxer<Muxer.ArrayBufferTarget> | null = null;
  private videoEncoder: VideoEncoder | null = null;
  private frameCount = 0;
  private fps: number;

  constructor(width: number, height: number, fps: number) {
    this.fps = fps;
    this.muxer = new Muxer.Muxer({
      target: new Muxer.ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width,
        height,
      },
      fastStart: 'in-memory',
    });

    this.videoEncoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer?.addVideoChunk(chunk, meta),
      error: (e) => console.error('VideoEncoder error', e),
    });

    this.videoEncoder.configure({
      codec: 'avc1.640028',
      width,
      height,
      bitrate: 12_000_000,
      framerate: fps,
    });
  }

  async addFrame(canvas: HTMLCanvasElement | HTMLImageElement) {
    if (!this.videoEncoder) return;
    
    // Backpressure: wait if encode queue is large
    while (this.videoEncoder.encodeQueueSize > 15) {
      await new Promise((r) => setTimeout(r, 50));
    }

    const frame = new VideoFrame(canvas, { timestamp: (this.frameCount * 1000000) / this.fps });
    this.videoEncoder.encode(frame);
    frame.close();
    this.frameCount++;
  }

  async save(filename: string = 'travnimation') {
    if (this.videoEncoder) {
      await this.videoEncoder.flush();
      this.videoEncoder.close();
    }
    if (this.muxer) {
      this.muxer.finalize();
      const buffer = this.muxer.target.buffer;
      const blob = new Blob([buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.mp4`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }
}
