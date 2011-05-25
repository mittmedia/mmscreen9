class Server
  @@mime_types = { :txt => 'text/plain', :js => 'application/x-javascript', :css => 'text/css' }
  
  def call(env)
    path = env["REQUEST_PATH"]
    if file_exists? file_name(path)
      [200, {'Content-Type' => mime_type_for_file(file_name(path))}, [ send_file file_name(path) ] ]
    else
      [404, {'Content-Type' => 'text/html'}, []]
    end
  end

  def file_name(path)
    if path[-1..-1] == "/"
      path += "index.html"
    end
    return path[1..-1]
  end
  
  def file_exists?(file)
    File.exists? file
  end
  
  def mime_type_for_file(file)
    @@mime_types[file.split(".").last.to_sym] || 'text/html'
  end
  
  def send_file(file)
    File.read file
  end
end

run Server.new