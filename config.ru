class Server
  @@mime_types = { :txt => 'text/plain', :js => 'application/x-javascript', :css => 'text/css' }
  
  def call(env)
    file = file_name env["REQUEST_PATH"]
    if File.exists? file
      [200, { 'Content-Type' => mime_type_for_file(file) }, [ File.read(file) ] ]
    else
      [404, { 'Content-Type' => 'text/html' }, []]
    end
  end

  def file_name(path)
    if path[-1..-1] == "/"
      path += "index.html"
    end
    return path[1..-1]
  end
  
  def mime_type_for_file(file)
    @@mime_types[file.split(".").last.to_sym] || 'text/html'
  end
  
end

run Server.new