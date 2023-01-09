import "./Afinador.css"
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { vetorEscalas } from "./escalas";

export default function Afinador() {
    const navigate = useNavigate();
    const [notaprev, setNotaPrev] = useState("");
    const [nota, setNota] = useState("");
    const [notanext, setNotaNext] = useState("");
    const [textoButtonMicrofone, setTextoButtonMicrofone] = useState("Ligar microfone");
    const [microfoneLigado, setMicrofoneLigado] = useState(false);
    const [osciladorLigado, setOsciladorLigado] = useState(false);
    const [x2, setX2] = useState(0);
    const [y2, setY2] = useState(0);
    const [strokeColor, setStrokeColor] = useState("rgba(255,150,150,1)");
    const stream = useRef<MediaStream>();
    const freqoscilador = useRef<HTMLInputElement>(null)
    var requestID = useRef<number>(0);
    var intervalID = useRef<number>(0);
    var audioctx = useRef<AudioContext>();
    var analyser = useRef<AnalyserNode>();
    var oscilador = useRef<OscillatorNode>();
    var byteArray = useRef<Uint8Array>();
    var floatArray = useRef<Float32Array>();
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
            if (freq <= vetorEscalas[i].ponto_medio_anterior && freq > 15) {
                setNotaPrev(vetorEscalas[i - 2].notabemol || "-");
                setNota(vetorEscalas[i - 1].nota)
                setNotaNext(vetorEscalas[i].nota);
                let faixaprev = vetorEscalas[i - 1].ponto_medio_anterior;
                let faixanext = vetorEscalas[i].ponto_medio_anterior;
                let faixa = faixanext - faixaprev;
                //2,356125 é 135º em radianos, 1.57075 é 45º em radianos
                //o ponteiro gira horário (ao contrário do círculo trigonométrico)
                //portanto faço os 135º - (porcentagem do tom)
                //o tom varia entre faixaprev e faixanext
                //essa variação muda o ponteiro em até 45º
                let angulo = 2.356125-((freq - faixaprev) * 1.57075 / faixa)
                let graus = angulo*360/6.28318
                //se os graus estão perto dos 90°, pinta o ponteiro de verde, do contrário deixa vermelho
                if(graus>80 && graus<110) setStrokeColor("rgba(0,233,33,1)"); 
                else setStrokeColor("rgba(255,150,150,1)");
                i = vetorEscalas.length;
                //essa buceta de SVG com y invertido é coisa de corno desgraçado!
                setX2(150 + Math.cos(angulo) * 150)
                setY2(150-Math.sin(angulo) * 150);
            }
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
                            noiseSuppression: true,
                            echoCancellation: true,
                            sampleRate: 48000
                        }
                    }
                );
                audioctx.current = new AudioContext({ sampleRate: 16384 });
                analyser.current = new AnalyserNode(audioctx.current, { fftSize: 32768 });
                const bufferlength = analyser.current.frequencyBinCount;
                floatArray.current = new Float32Array(bufferlength);
                byteArray.current = new Uint8Array(bufferlength);
                let microfoneSource = new MediaStreamAudioSourceNode(audioctx.current!, { mediaStream: stream.current })

                let cortaAltas1 = new BiquadFilterNode(audioctx.current!, {
                    type: "lowpass",
                    frequency: 700,
                    Q: 1
                })
                let cortaAltas2 = new BiquadFilterNode(audioctx.current!, {
                    type: "lowpass",
                    frequency: 700,
                    Q: 2
                })

                microfoneSource
                    .connect(cortaAltas1)
                    .connect(cortaAltas2)
                    .connect(analyser.current)
                    //.connect(audioctx.current.destination);
                monitorarPitch();
            } catch (error) {
                alert("Erro ao pegar microfone do usuario")
                console.log(error)
            }
        } else {
            setMicrofoneLigado(false);
            setTextoButtonMicrofone("Ligar microfone");
            clearInterval(intervalID.current)
            cancelAnimationFrame(requestID.current);
            stream.current!.getAudioTracks()[0].stop()
            // let canvasCtx = canvas.current!.getContext("2d")!;
            // canvasCtx.clearRect(0, 0, canvas.current!.width, canvas.current!.height);
            audioctx.current!.close();
            audioctx.current = undefined;
        }
    }

    function monitorarPitch() {
        requestID.current = requestAnimationFrame(monitorarPitch);
        analyser.current!.getByteFrequencyData(byteArray.current!);

        let barraPico = 1;
        let indicePico = 0;

        //Minha resolução está em 0,5hz, ou seja, cada item do vetor representa um incremento de 0,5hz
        //Exemplo: se o indice [440] for o pico de frequencia, quer dizer que a frequencia é 440/2 = 220hz (nota lá)
        for (let i = 0; i < byteArray.current!.length; i += 2) {
            if (byteArray.current![i] > barraPico) {
                barraPico = byteArray.current![i];
                indicePico = i;
            }
        }        
        calculaEscala(indicePico/2);
    }

    function handleOscilador() {
        if (!osciladorLigado) {
            setOsciladorLigado(true);
            audioctx.current = new AudioContext({ sampleRate: 16384 });
            analyser.current = new AnalyserNode(audioctx.current, { fftSize: 32768 });
            const bufferlength = analyser.current.frequencyBinCount;
            floatArray.current = new Float32Array(bufferlength);
            byteArray.current = new Uint8Array(bufferlength);
            oscilador.current = new OscillatorNode(audioctx.current!, { frequency: parseFloat(freqoscilador.current!.value), type: "sine" })
            oscilador.current.connect(analyser.current).connect(audioctx.current.destination)
            oscilador.current.start();
            monitorarPitch();

        } else {
            setOsciladorLigado(false);
            clearInterval(intervalID.current!)
            cancelAnimationFrame(requestID.current!)
            oscilador.current?.stop();
            analyser.current?.disconnect();
            audioctx.current?.close();
            audioctx.current = undefined;
        }
    }

    return (

        <div className="afinadormaindiv">
            <h1>Afinador</h1>
            <div id="divmostrador">
                <div id="divdosspans">
                    <span id="prev">{notaprev}</span>
                    <span id="nota">{nota}</span>
                    <span id="next">{notanext}</span>
                </div>
                <svg width={300} height={150}>
                    <line
                        x1="150"
                        y1="150"
                        x2={x2}
                        y2={y2}
                        style={{ stroke: strokeColor, strokeWidth: 10 }}
                    />
                </svg>
            </div>
            <button id="microfoneButton" onClick={handlePegarMicrofone}>{textoButtonMicrofone}</button>
            <br />
            {/* <input ref={freqoscilador} type="number" name="freqoscilador" id="freqoscilador" />
            <button onClick={handleOscilador}>Ligar Oscilador</button> */}
            <button onClick={() => { navigate("/") }}>Ir para o metrônomo</button>
        </div>
    )
}