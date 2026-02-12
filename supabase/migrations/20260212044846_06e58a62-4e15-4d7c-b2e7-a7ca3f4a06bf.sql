-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (is_admin());

-- Allow admins to delete venda_documentos
CREATE POLICY "Admins can manage venda_documentos"
ON public.venda_documentos
FOR ALL
USING (is_admin());
