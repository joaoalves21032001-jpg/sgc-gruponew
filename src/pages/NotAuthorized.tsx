import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function NotAuthorized() {
    const navigate = useNavigate();
    
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
            <ShieldAlert className="w-24 h-24 text-red-500 mb-6" />
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Acesso Restrito</h1>
            <p className="text-slate-600 max-w-md mb-8">
                Você não possui permissão para visualizar o conteúdo desta página ou de nenhuma de suas abas.
                Se você acredita que isso é um erro, solicite o acesso ao seu administrador.
            </p>
            <Button onClick={() => navigate('/meu-progresso')} className="bg-primary text-white hover:bg-primary/90">
                Voltar ao Início
            </Button>
        </div>
    );
}
