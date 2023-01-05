import "./Metronomo.css";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ticwav from "../assets/tic.wav";
import tecwav from "../assets/tec.wav";
import tacwav from "../assets/tac.wav";

export default function Metronomo() {
    var audioctx = useRef<AudioContext>();
    var masterVolume = useRef<GainNode>();
    var tic_buffer: AudioBuffer;
    var tec_buffer: AudioBuffer;
    var tac_buffer: AudioBuffer;
    const [tocando, setTocando] = useState(false)
    const [tempo, setTempo] = useState(120)
    const [volume, setVolume] = useState(1)
    const [compasso, setCompasso] = useState(4);
    const [tempo_notas, setTempo_notas] = useState(1);
    var intervalo = useRef(60 / tempo / tempo_notas);
    var timestamp = useRef(0);
    var sequencia = useRef(0);
    var tocarproxima = useRef<Function[]>([]);
    const navigate = useNavigate();

    async function setupAudioContext() {
        audioctx.current = new AudioContext();

        let response = await fetch(ticwav);
        let raw_buffer = await response.arrayBuffer();
        tic_buffer = await audioctx.current.decodeAudioData(raw_buffer);

        response = await fetch(tecwav);
        raw_buffer = await response.arrayBuffer();
        tec_buffer = await audioctx.current.decodeAudioData(raw_buffer);

        response = await fetch(tacwav);
        raw_buffer = await response.arrayBuffer();
        tac_buffer = await audioctx.current.decodeAudioData(raw_buffer);

        masterVolume.current = new GainNode(audioctx.current, { gain: volume });
        masterVolume.current.connect(audioctx.current.destination);
    }

    async function playTic() {
        console.log("tic");
        let ticSource = new AudioBufferSourceNode(audioctx.current!, { buffer: tic_buffer });
        ticSource.connect(masterVolume.current!);
        ticSource.start(timestamp.current);
        timestamp.current += intervalo.current;
        sequencia.current === tocarproxima.current.length - 1 ? (sequencia.current = 0) : sequencia.current++;
        ticSource.onended = () => {
            tocarproxima.current[sequencia.current]();
        };
    }
    async function playTec() {
        console.log("tec");
        let tecSource = new AudioBufferSourceNode(audioctx.current!, { buffer: tec_buffer });
        tecSource.connect(masterVolume.current!);
        tecSource.start(timestamp.current);
        timestamp.current += intervalo.current;
        sequencia.current === tocarproxima.current.length - 1 ? (sequencia.current = 0) : sequencia.current++;
        tecSource.onended = () => {
            tocarproxima.current[sequencia.current]();
        };
    }
    async function playTac() {
        console.log("tac");
        let tacSource = new AudioBufferSourceNode(audioctx.current!, { buffer: tac_buffer });
        tacSource.connect(masterVolume.current!);
        tacSource.start(timestamp.current);
        timestamp.current += intervalo.current;
        sequencia.current === tocarproxima.current.length - 1 ? (sequencia.current = 0) : sequencia.current++;
        tacSource.onended = () => {
            tocarproxima.current[sequencia.current]();
        };
    }

    async function pararMetronomo() {
        setTocando(false);
        await audioctx.current!.close();
    }

    function handleCompasso(e: any) {
        setCompasso(parseInt(e.target.value));
    }

    function handleTempoNotas(e: any) {
        setTempo_notas(parseInt(e.target.value));
    }

    function handleVolume(e: any) {
        setVolume(parseFloat(e.target.value));
        masterVolume.current!.gain.setValueAtTime(volume, audioctx.current!.currentTime);
    }

    function handleTempo(e: any) {
        setTempo(parseInt(e.target!.value));
        intervalo.current = 60 / tempo / tempo_notas;
    }

    async function tocarMetronomo() {
        if (tocando === true) return;
        if (audioctx.current === undefined || audioctx.current.state === "closed") {
            console.log("Entrou no if, então audioctx.current ou é undefined ou é closed");
            await setupAudioContext();
        }
        let multiplicação = compasso * tempo_notas;
        if (multiplicação === 3) tocarproxima.current = [playTic, playTec, playTec];
        if (multiplicação === 4) tocarproxima.current = [playTic, playTec, playTec, playTec];
        if (multiplicação === 6) tocarproxima.current = [playTic, playTac, playTec, playTac, playTec, playTac];
        if (multiplicação === 8)
            tocarproxima.current = [playTic, playTac, playTec, playTac, playTec, playTac, playTec, playTac];
        intervalo.current = 60 / tempo / tempo_notas;
        timestamp.current = 0;
        sequencia.current = 0;
        tocarproxima.current[0]();
        setTocando(true);
    }

    //git subtree push --prefix dist origin gh-pages

    return (
        <div className="maindiv">
            <div className="centralizar">
                <h1>Metrônomo</h1>
                <div className="divdotempo">
                    <label htmlFor="tempo_slider">Tempo:</label>
                    <h1 id="tempo_mostrador">{tempo}</h1>
                    <input onChange={handleTempo} type="range" name="tempo_slider" id="tempo_slider" min="60" max="220" step="1" value={tempo} />
                </div>
                <div className="divdocompasso">
                    <table>
                        <tbody>
                            <tr>
                                <td><label htmlFor="compasso_select">Compasso:</label></td>
                                <td>
                                    <select disabled={tocando} onChange={handleCompasso} id="compasso_select" 
                                    name="compasso_select" defaultValue={4} >
                                        <option value="3">3</option>
                                        <option value="4">4</option>
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <label htmlFor="tempo_notas_select">Tempo das notas:</label>
                                </td>
                                <td>
                                    <select disabled={tocando} onChange={handleTempoNotas} id="tempo_notas_select"
                                    name="tempo_notas_select" defaultValue={1} >
                                        <option value="1" >Semínima</option>
                                        <option value="2">Colcheia</option>
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td><button disabled={tocando} id="tocarButton" onClick={tocarMetronomo}>Tocar</button></td>
                                <td><button id="pararButton" onClick={pararMetronomo}>Parar</button></td>
                            </tr>
                        </tbody>
                    </table>
                    <button onClick={() => {navigate("/afinador")}}>Ir para o afinador</button>
                </div>
            </div>
            <div className="divdovolume">
                <h4><label htmlFor="volume_slider">Volume:</label></h4>
                {(volume*100/5).toFixed(0)} %
                <input onChange={handleVolume} type="range" name="volume_slider" 
                id="volume_slider" min="0" max="5" step="0.05" value={volume} />
            </div>
        </div>
    )
}