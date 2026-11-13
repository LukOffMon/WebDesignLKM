import sys, sherpa_onnx, soundfile as sf
d = sys.argv[1]; text = sys.argv[2]; out = sys.argv[3]; speed = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
import glob
model = glob.glob(d + '/*.onnx')[0]
cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=model, tokens=d + '/tokens.txt', data_dir=d + '/espeak-ng-data'), num_threads=4))
tts = sherpa_onnx.OfflineTts(cfg)
a = tts.generate(text, sid=0, speed=speed)
sf.write(out, a.samples, a.sample_rate)
print(len(a.samples) / a.sample_rate)
