from pathlib import Path
import numpy as np
import rasterio
from rasterio.transform import from_origin

NODATA = -9999
ROWS = 3600

def cols_for_lat(lat_ll: int) -> int:
    """
    lat_ll is the integer latitude of the tile's lower-left corner (e.g., 42 for raw/42_45).
    Column rule per TessaDEM spec.
    """
    a = abs(lat_ll)
    if a < 50:
        return 3600
    elif a < 60:
        return 2400
    elif a < 70:
        return 1800
    elif a < 80:
        return 1200
    else:
        return 720

def convert_tile(raw_path: Path, out_tif: Path):
    # Parse lat/lon from filename: "<lat>_<lon>"
    lat_ll, lon_ll = map(int, raw_path.name.split("_"))
    cols = cols_for_lat(lat_ll)

    # Read raw binary int16 little-endian
    data = np.fromfile(raw_path, dtype="<i2")
    expected = ROWS * cols
    if data.size != expected:
        raise ValueError(f"{raw_path} has {data.size} samples, expected {expected} (rows={ROWS}, cols={cols})")

    data = data.reshape((ROWS, cols))

    # GeoTIFF needs upper-left origin.
    # Tile spans: lon in [lon_ll, lon_ll+1), lat in [lat_ll, lat_ll+1)
    ul_lon = lon_ll
    ul_lat = lat_ll + 1

    px_w = 1.0 / cols
    px_h = 1.0 / ROWS

    transform = from_origin(ul_lon, ul_lat, px_w, px_h)

    profile = {
        "driver": "GTiff",
        "height": ROWS,
        "width": cols,
        "count": 1,
        "dtype": "int16",
        "crs": "EPSG:4326",
        "transform": transform,
        "nodata": NODATA,
        "compress": "DEFLATE",
        "predictor": 2,
        "tiled": True,
        "blockxsize": 256,
        "blockysize": 256,
    }

    out_tif.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(out_tif, "w", **profile) as dst:
        dst.write(data, 1)

    print("Wrote:", out_tif)

if __name__ == "__main__":
    raw_file = Path(r"C:\data\elevation\raw\42_45")   # adjust
    out_file = Path(r"C:\data\elevation\geotiff\42_45.tif")
    convert_tile(raw_file, out_file)
