import "./Afinador.css"
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { vetorEscalas } from "./escalas";
import PitchFinder from "pitchfinder"

export default function Afinador() {
    const navigate = useNavigate();
    const [notaprev, setNotaPrev] = useState("");
    const [nota, setNota] = useState("");
    const [notanext, setNotaNext] = useState("");
    const [textoButtonMicrofone, setTextoButtonMicrofone] = useState("Ligar microfone");
    const [microfoneLigado, setMicrofoneLigado] = useState(false);
    const [osciladorLigado, setOsciladorLigado] = useState(false);
    const stream = useRef<MediaStream>();
    const freqoscilador = useRef<HTMLInputElement>(null)
    var requestID = useRef<number>(0);
    var audioctx = useRef<AudioContext>();
    var analyser = useRef<AnalyserNode>();
    var oscilador = useRef<OscillatorNode>();
    var dataArray = useRef<Uint8Array>();
    var dataFloat = useRef<Float32Array>();
    const canvas = useRef<HTMLCanvasElement>(null);

    /**
     * a classe Escala nesse programa eu considero que seja a régua, o mostrador graduado que
     * é exibido nos afinadores. Se você tenta chegar na nota A, o mostrador tem que mostrar
     * Ab ------- A ------- A#
     * A -------- A# ------- B
     * A função calculaEscala() recebe uma frequencia e modifica o UI mostrando a escala que 
     * chega mais próxima da frequencia recebida
     */

    /**
     * Pro McLeod funcionar:
     * AudioContext pode pegar qualquer samplerate, mas fft tem que ser 2048 ou maior.
     * No McLeod é OBRIGATÓRIO passar o tamanho do buffer
     * esses pitch detectors funcionam com o array float de TIME DOMAIN: getFloatTimeDomainData
     */

    function calculaEscala(freq: number) {
        for (let i = 2; i < vetorEscalas.length; i++) {
            if (freq < vetorEscalas[i].frequencia && freq > 15) {
                if (freq > vetorEscalas[i].ponto_medio_anterior) {
                    setNotaPrev(vetorEscalas[i - 1].notabemol || "-");
                    setNota(vetorEscalas[i].nota)
                    setNotaNext(vetorEscalas[i + 1].nota);
                    i = vetorEscalas.length;
                } else {
                    setNotaPrev(vetorEscalas[i - 2].notabemol || "-");
                    setNota(vetorEscalas[i - 1].nota);
                    setNotaNext(vetorEscalas[i].nota);
                    i = vetorEscalas.length;
                }
            }
        }
    }

    function desenharVisualização() {
        requestID.current = requestAnimationFrame(desenharVisualização);
        analyser.current!.getByteFrequencyData(dataArray.current!);
        let canvasCtx = canvas.current!.getContext("2d")!;
        canvasCtx.clearRect(0, 0, canvas.current!.width, canvas.current!.height);
        canvasCtx.fillStyle = "#00CCFF";

        dataFloat.current = new Float32Array(analyser.current!.fftSize)
        analyser.current!.getFloatTimeDomainData(dataFloat.current);
        //const detector = PitchFinder.AMDF({sampleRate: 48000,minFrequency:50, maxFrequency: 4000});
        //const detector = PitchFinder.YIN({sampleRate:48000})
        const detector = PitchFinder.Macleod({ bufferSize: dataFloat.current!.length, sampleRate: 44100, cutoff: 0.98 });
        var freq_detectada = detector(dataFloat.current);
        console.log(freq_detectada.freq)

        for (let i = 0; i < 1024; i++) {
            let bar_x = i * 0.5;
            let bar_height = -(dataArray.current![i]);
            canvasCtx.fillRect(bar_x, 300, 0.4, bar_height);
        }
    }

    async function handlePegarMicrofone() {
        if (!microfoneLigado) {
            setMicrofoneLigado(true);
            setTextoButtonMicrofone("Desligar microfone");
            try {
                stream.current = await navigator.mediaDevices.getUserMedia(
                    {
                        audio:
                        {
                            noiseSuppression: false,
                            echoCancellation: false,
                            autoGainControl: false,
                            latency: 0,
                            sampleRate: 48000
                        }
                    }
                );
                audioctx.current = new AudioContext({ sampleRate: 48000 });
                analyser.current = new AnalyserNode(audioctx.current, { fftSize: 4096 });
                const bufferlength = analyser.current.frequencyBinCount;

                dataArray.current = new Uint8Array(bufferlength);
                let microfoneSource = new MediaStreamAudioSourceNode(audioctx.current!, { mediaStream: stream.current })
                microfoneSource.connect(analyser.current);
                analyser.current.connect(audioctx.current.destination);
                desenharVisualização();
            } catch (error) {
                alert("Erro ao pegar microfone do usuario")
                console.log(error)
            }
        } else {
            setMicrofoneLigado(false);
            setTextoButtonMicrofone("Ligar microfone");
            cancelAnimationFrame(requestID.current);
            stream.current!.getAudioTracks()[0].stop()
            let canvasCtx = canvas.current!.getContext("2d")!;
            canvasCtx.clearRect(0, 0, canvas.current!.width, canvas.current!.height);
            audioctx.current!.close();
            audioctx.current = undefined;
        }
    }

    function handleOscilador() {
        if (!osciladorLigado) {
            setOsciladorLigado(true);
            audioctx.current = new AudioContext({ sampleRate: 44100 });
            analyser.current = new AnalyserNode(audioctx.current, { fftSize: 2048 });
            const bufferlength = analyser.current.frequencyBinCount;
            dataArray.current = new Uint8Array(bufferlength);
            console.log("numero de barrinhas: " + bufferlength)
            oscilador.current = new OscillatorNode(audioctx.current!, { frequency: parseFloat(freqoscilador.current!.value), type: "triangle" })
            oscilador.current.connect(analyser.current).connect(audioctx.current.destination)
            oscilador.current.start();
            desenharVisualização();
        } else {
            setOsciladorLigado(false);
            cancelAnimationFrame(requestID.current);
            oscilador.current?.stop();
            analyser.current?.disconnect();
            audioctx.current?.close();
            audioctx.current = undefined;
        }
    }

    return (

        <div className="afinadormaindiv">
            <h1>Afinador</h1>
            <button onClick={handlePegarMicrofone}>{textoButtonMicrofone}</button>
            <br />
            <span id="prev">{notaprev}</span>
            <span id="nota">{nota}</span>
            <span id="next">{notanext}</span>
            <br />
            <input type="number" name="freqoscilador" id="freqoscilador" ref={freqoscilador} defaultValue={64} />
            <button onClick={handleOscilador}>Toggle oscilador</button>
            <div id="divanalyser">
                <canvas width="1024" height="300px" ref={canvas} id="canvas">

                </canvas>
                <br />
            </div>
            <button onClick={() => { navigate("/") }}>Ir para o metrônomo</button>
        </div>
    )
}