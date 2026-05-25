import { useEffect, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import ePub from 'epubjs'

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js'

export default function Home() {
  const [text, setText] = useState('Upload PDF or EPUB')
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [rate, setRate] = useState(1)
  const [speaking, setSpeaking] = useState(false)0
  

  useEffect(() => {
    loadVoices()

    speechSynthesis.onvoiceschanged = () => {
      loadVoices()
    }
  }, [])

  const loadVoices = () => {
    const availableVoices = speechSynthesis.getVoices()

    setVoices(availableVoices)

    if (availableVoices.length > 0) {
      setSelectedVoice(availableVoices[0].name)
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]

    if (!file) return

    const extension = file.name.split('.').pop().toLowerCase()

    if (extension === 'pdf') {
      readPDF(file)
    } else if (extension === 'epub') {
      readEPUB(file)
    } else {
      alert('Only PDF and EPUB supported')
    }
  }

  const readPDF = async (file) => {
    const reader = new FileReader()

    reader.onload = async function () {
      const typedArray = new Uint8Array(this.result)

      const pdf = await pdfjsLib.getDocument(typedArray).promise

      let fullText = ''

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)

        const content = await page.getTextContent()

        const strings = content.items.map((item) => item.str)

        fullText += strings.join(' ') + '\n\n'
      }

      setText(fullText)
    }

    reader.readAsArrayBuffer(file)
  }

  const readEPUB = async (file) => {
    const book = ePub(file)

    await book.ready

    let fullText = ''

    const spineItems = book.spine.spineItems

    for (const item of spineItems) {
      const doc = await item.load(book.load.bind(book))

      fullText += doc.body.textContent + '\n\n'

      item.unload()
    }

    setText(fullText)
  }

  const startReading = () => {
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    const voice = voices.find((v) => v.name === selectedVoice)

    if (voice) {
      utterance.voice = voice
    }

    utterance.rate = rate

    utterance.onstart = () => {
      setSpeaking(true)
    }

    utterance.onend = () => {
      setSpeaking(false)
    }

    speechSynthesis.speak(utterance)
  }

  const stopReading = () => {
    speechSynthesis.cancel()
    setSpeaking(false)
  }

  return (
    <div className="container">
      <div className="title">
        AI Story Reader
      </div>

      <input
        type="file"
        accept=".pdf,.epub"
        onChange={handleFile}
      />

      <div className="controls">
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
        >
          {voices.map((voice, index) => (
            <option key={index} value={voice.name}>
              {voice.name}
            </option>
          ))}
        </select>

        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />

        {!speaking ? (
          <button onClick={startReading}>
            Read Aloud
          </button>
        ) : (
          <button onClick={stopReading}>
            Stop
          </button>
        )}
      </div>

      <div className="reader">
        {text}
      </div>
    </div>
  )
}
