/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { generateDecadeImage, remixImage } from './services/geminiService';
import PolaroidCard from './components/PolaroidCard';
import { createAlbumPage } from './lib/albumUtils';
import Footer from './components/Footer';

const MALE_HAIRSTYLES = ['Corte Buzz (com Degradê)', 'Undercut Desconectado', 'Coque Samurai', 'Cabelo Médio Despenteado', 'Tranças Nagô', 'Cabelo Longo Ondulado'];
const FEMALE_HAIRSTYLES = ['Pixie Assimétrico', 'Bob Francês (com Franja)', 'Ondas de Sereia (Longo)', 'Coque Alto (Despenteado)', 'Tranças Boxeadora', 'Afro Volumoso'];

type ImageStatus = 'pending' | 'done' | 'error';
interface GeneratedImage {
    status: ImageStatus;
    url?: string;
    error?: string;
}

const primaryButtonClasses = "font-permanent-marker text-lg text-center text-black bg-yellow-400 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:-rotate-2 hover:bg-yellow-300 shadow-[2px_2px_0px_2px_rgba(0,0,0,0.2)]";
const secondaryButtonClasses = "font-permanent-marker text-lg text-center text-white bg-white/10 backdrop-blur-sm border-2 border-white/80 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:rotate-2 hover:bg-white hover:text-black";


function App() {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<Record<string, GeneratedImage>>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [appState, setAppState] = useState<'idle' | 'image-uploaded' | 'generating' | 'results-shown'>('idle');
    const [selectedGender, setSelectedGender] = useState<'masculino' | 'feminino' | null>(null);

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setAppState('image-uploaded');
                setGeneratedImages({}); // Clear previous results
                setSelectedGender(null); // Reset gender selection
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async (gender: 'masculino' | 'feminino') => {
        if (!uploadedImage) return;

        setSelectedGender(gender);
        setIsLoading(true);
        setAppState('generating');
        
        const hairstyles = gender === 'masculino' ? MALE_HAIRSTYLES : FEMALE_HAIRSTYLES;
        const initialImages: Record<string, GeneratedImage> = {};
        hairstyles.forEach(hairstyle => {
            initialImages[hairstyle] = { status: 'pending' };
        });
        setGeneratedImages(initialImages);

        const concurrencyLimit = 2; // Process two at a time
        const hairstyleQueue = [...hairstyles];

        const processHairstyle = async (hairstyle: string) => {
            try {
                const genderTerm = gender === 'masculino' ? 'masculino' : 'feminino';
                const prompt = `Dê à pessoa nesta foto um penteado ${genderTerm} moderno '${hairstyle}'. O resultado deve ser uma imagem fotorrealista, perfeita para uma consulta de barbearia, focando na mudança do penteado e preservando ao máximo as feições da pessoa.`;
                const resultUrl = await generateDecadeImage(uploadedImage, prompt, hairstyle, gender);
                setGeneratedImages(prev => ({
                    ...prev,
                    [hairstyle]: { status: 'done', url: resultUrl },
                }));
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                setGeneratedImages(prev => ({
                    ...prev,
                    [hairstyle]: { status: 'error', error: errorMessage },
                }));
                console.error(`Failed to generate image for ${hairstyle}:`, err);
            }
        };

        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (hairstyleQueue.length > 0) {
                const hairstyle = hairstyleQueue.shift();
                if (hairstyle) {
                    await processHairstyle(hairstyle);
                }
            }
        });

        await Promise.all(workers);

        setIsLoading(false);
        setAppState('results-shown');
    };

    const handleRegenerateDecade = async (hairstyle: string) => {
        if (!uploadedImage || !selectedGender) return;

        if (generatedImages[hairstyle]?.status === 'pending') {
            return;
        }
        
        console.log(`Regenerating image for ${hairstyle}...`);

        setGeneratedImages(prev => ({
            ...prev,
            [hairstyle]: { status: 'pending' },
        }));

        try {
            const genderTerm = selectedGender === 'masculino' ? 'masculino' : 'feminino';
            const prompt = `Dê à pessoa nesta foto um penteado ${genderTerm} moderno '${hairstyle}'. O resultado deve ser uma imagem fotorrealista, perfeita para uma consulta de barbearia, focando na mudança do penteado e preservando ao máximo as feições da pessoa.`;
            const resultUrl = await generateDecadeImage(uploadedImage, prompt, hairstyle, selectedGender);
            setGeneratedImages(prev => ({
                ...prev,
                [hairstyle]: { status: 'done', url: resultUrl },
            }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setGeneratedImages(prev => ({
                ...prev,
                [hairstyle]: { status: 'error', error: errorMessage },
            }));
            console.error(`Failed to regenerate image for ${hairstyle}:`, err);
        }
    };

    const handleRemixDecade = async (hairstyle: string, prompt: string) => {
        const sourceImage = generatedImages[hairstyle]?.url;

        if (!sourceImage || !prompt) return;
        if (generatedImages[hairstyle]?.status === 'pending') return;

        console.log(`Remixing image for ${hairstyle} with prompt: "${prompt}"`);

        setGeneratedImages(prev => ({
            ...prev,
            [hairstyle]: { ...prev[hairstyle], status: 'pending' },
        }));

        try {
            const resultUrl = await remixImage(sourceImage, prompt);
            setGeneratedImages(prev => ({
                ...prev,
                [hairstyle]: { status: 'done', url: resultUrl },
            }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setGeneratedImages(prev => ({
                ...prev,
                [hairstyle]: { status: 'error', url: sourceImage, error: errorMessage },
            }));
            console.error(`Failed to remix image for ${hairstyle}:`, err);
            alert(`Lamentamos, ocorreu um erro ao modificar a sua imagem: ${errorMessage}`);
        }
    };
    
    const handleReset = () => {
        setUploadedImage(null);
        setGeneratedImages({});
        setSelectedGender(null);
        setAppState('idle');
    };

    const handleDownloadIndividualImage = (hairstyle: string) => {
        const image = generatedImages[hairstyle];
        if (image?.status === 'done' && image.url) {
            const link = document.createElement('a');
            link.href = image.url;
            link.download = `estudio-de-estilos-${hairstyle.replace(' ', '-')}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDownloadAlbum = async () => {
        setIsDownloading(true);
        try {
            const imageData = Object.entries(generatedImages)
                .filter(([, image]) => image.status === 'done' && image.url)
                .reduce((acc, [hairstyle, image]) => {
                    acc[hairstyle] = image!.url!;
                    return acc;
                }, {} as Record<string, string>);
            
            const hairstyles = selectedGender === 'masculino' ? MALE_HAIRSTYLES : FEMALE_HAIRSTYLES;
            if (Object.keys(imageData).length < hairstyles.length) {
                alert("Por favor, aguarde que todas as imagens terminem de ser geradas antes de descarregar o álbum.");
                return;
            }

            const albumDataUrl = await createAlbumPage(imageData);

            const link = document.createElement('a');
            link.href = albumDataUrl;
            link.download = 'estudio-de-estilos-album.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Failed to create or download album:", error);
            alert("Lamentamos, ocorreu um erro ao criar o seu álbum. Por favor, tente novamente.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <main className="bg-black text-neutral-200 min-h-screen w-full flex flex-col items-center justify-center p-4 pb-24 relative">
            <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.05]"></div>
            
            <div className="z-10 flex flex-col items-center justify-center w-full h-full flex-1">
                <div className="text-center mb-10">
                    <h1 className="text-7xl md:text-9xl font-display tracking-wider text-neutral-100">Estúdio de Estilos</h1>
                    <p className="text-neutral-300 mt-2 text-xl tracking-wide">Encontre o seu próximo visual.</p>
                </div>

                {appState === 'idle' && (
                     <motion.div
                         initial={{ opacity: 0, scale: 0.8 }}
                         animate={{ opacity: 1, scale: 1 }}
                         transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
                         className="flex flex-col items-center"
                    >
                        <label htmlFor="file-upload" className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                             <PolaroidCard 
                                 caption="Clique para começar"
                                 status="done"
                             />
                        </label>
                        <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                        <p className="mt-8 text-neutral-500 text-center max-w-xs text-lg">
                            Carregue a sua foto para experimentar penteados modernos.
                        </p>
                    </motion.div>
                )}

                {appState === 'image-uploaded' && uploadedImage && (
                    <div className="flex flex-col items-center gap-6">
                         <PolaroidCard 
                            imageUrl={uploadedImage} 
                            caption="A Sua Foto" 
                            status="done"
                         />
                         <div className="text-center mt-4">
                            <p className="font-bold text-lg text-neutral-300">Para quem são os estilos?</p>
                            <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
                                <button onClick={() => handleGenerate('masculino')} className={primaryButtonClasses}>
                                    Masculinos
                                </button>
                                <button onClick={() => handleGenerate('feminino')} className={primaryButtonClasses}>
                                    Femininos
                                </button>
                            </div>
                            <button onClick={handleReset} className={`${secondaryButtonClasses} mt-6`}>
                                Escolher Outra Foto
                            </button>
                         </div>
                    </div>
                )}

                {(appState === 'generating' || appState === 'results-shown') && selectedGender && (
                     <>
                        <div className="w-full max-w-6xl flex-1 mt-4 p-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {(selectedGender === 'masculino' ? MALE_HAIRSTYLES : FEMALE_HAIRSTYLES).map((hairstyle) => (
                                    <div key={hairstyle} className="flex justify-center">
                                         <PolaroidCard
                                            caption={hairstyle}
                                            status={generatedImages[hairstyle]?.status || 'pending'}
                                            imageUrl={generatedImages[hairstyle]?.url}
                                            error={generatedImages[hairstyle]?.error}
                                            onRegenerate={handleRegenerateDecade}
                                            onRemix={handleRemixDecade}
                                            onDownload={handleDownloadIndividualImage}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                         <div className="h-20 mt-4 flex items-center justify-center">
                            {appState === 'results-shown' && (
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <button 
                                        onClick={handleDownloadAlbum} 
                                        disabled={isDownloading} 
                                        className={`${primaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {isDownloading ? 'A Criar Álbum...' : 'Descarregar Álbum'}
                                    </button>
                                    <button onClick={handleReset} className={secondaryButtonClasses}>
                                        Começar de Novo
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            <Footer />
        </main>
    );
}

export default App;