import tarfile

tar_path = r"C:\Users\User\OneDrive\Desktop\RAW-elevation_data\tessadem-202512301511.tar.bz2"

with tarfile.open(tar_path, "r:bz2") as t:
    for m in t.getmembers()[:10]:
        print(m.name)
