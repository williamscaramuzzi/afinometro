import "./Afinador.css"
import {useState, useRef} from "react";
import {useNavigate} from "react-router-dom";

import { vetorEscalas } from "./escalas";

export default function Afinador() {
    const navigate = useNavigate();
    const [notaprev, setNotaPrev] = useState("");
    const [nota, setNota] = useState("");
    const [notanext, setNotaNext] = useState("");
    var inputFrequencia = useRef<HTMLInputElement>(null);

    /**
 * a classe Escala nesse programa eu considero que seja a régua, o mostrador graduado que
 * é exibido nos afinadores. Se você tenta chegar na nota A, o mostrador tem que mostrar
 * Ab ------- A ------- A#
 * A -------- A# ------- B
 * A função calculaEscala() recebe uma frequencia e modifica o UI mostrando a escala que 
 * chega mais próxima da frequencia recebida
 */

function calculaEscala(){
    let freq = parseFloat(inputFrequencia.current!.value);
    for (let i = 0; i < vetorEscalas.length; i++) {
        if (freq < vetorEscalas[i].frequencia) {
            console.log("frequencia digitada é menor que a da nota " + vetorEscalas[i].nota + " cuja frequencia é: " + vetorEscalas[i].frequencia)
            if (freq > vetorEscalas[i].ponto_medio_anterior) {
                setNotaPrev(vetorEscalas[i - 1].notabemol);
                setNota(vetorEscalas[i].nota)
                setNotaNext(vetorEscalas[i + 1].nota);
                i = vetorEscalas.length;
            } else {
                setNotaPrev(vetorEscalas[i - 2].notabemol);
                setNota(vetorEscalas[i-1].nota);
                setNotaNext(vetorEscalas[i].nota);
                i = vetorEscalas.length;
            }
        } 
    }
}

    return (

        <div className="afinadormaindiv">
            <h1>Afinador</h1>
            <input ref={inputFrequencia} type="number" id="frequencia_field" />
            <br/>
                <button id="calcular_button" onClick={()=>{calculaEscala()}}>Calcular</button>
                <br/>
                    <span id="prev">{notaprev}</span>
                    <span id="nota">{nota}</span>
                    <span id="next">{notanext}</span>
                    <br/>
                        <button onClick={()=>{navigate("/")}}>Ir para o metrônomo</button>
                    </div>
                    )
}