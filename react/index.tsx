import { canUseDOM } from 'vtex.render-runtime'

import type { PixelMessage } from './typings/events'

declare global {
  interface Window {
    InsiderQueue?: any;
  }
}

//let page_type: any = ''
function injectInsiderScript() {
  if (window.InsiderQueue) {
    const script = document.createElement('script')

    script.async = true
    script.src = 'https://manole.api.useinsider.com/ins.js?id=10012431'
    document.head.appendChild(script)
  }
}

function getPageName(input: string) {
  const parts = input.split(/[.#]/)

  // Se houver um #, retorna o elemento na posição 1, se houver ., retorna o segundo elemento
  if (input.includes('#')) {
    return parts[2] || null
  }

  if (input.includes('.')) {
    return parts[1] || null
  }

  return null
}

function getImageProduct(imagens: string | undefined) {
  if (!imagens) {
    return
  }
  return imagens.split('?')[0];
}
function extractCategoryNames(categories: any) {

  if (!categories) {
    return []
  }
  return categories.map((category: { name: any; }) => category.name);
}

function formatPathSegments(url: any) {
  // Extrai o caminho da URL (parte entre o domínio e a query string)
  const path = new URL(url).pathname;

  // Divide o caminho em segmentos e filtra valores vazios
  const segments = path.split('/').filter(segment => segment && segment !== '__bindingAddress');

  // Formata cada segmento conforme as regras
  const formatted = segments.map(segment => {
    // Substitui hífens por espaços
    let formattedSegment = segment.replace(/-/g, ' ');

    // Capitaliza cada palavra
    formattedSegment = formattedSegment.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Trata a exceção específica
    if (formattedSegment === 'Cursos Na Area Da Saude') {
      return 'Curso na área da saúde';
    }

    return formattedSegment;
  });

  return formatted;
}


/*Add to CART*/

// Busca o evento de add_to_cart no dataLayer
function getViewItemEvent(eventDataLayer: any, dataLayer: any) {
  for (let i = dataLayer.length - 1; i >= 0; i--) {
    if (dataLayer[i].event === eventDataLayer) {
      return dataLayer[i];
    }
  }
  return null;
}

// Função para formatar valores monetários
function tratarNumero(valor: any) {
  let str = valor.toString();

  let zerosFinais = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    if (str.charAt(i) === '0') {
      zerosFinais++;
    } else {
      break;
    }
  }

  // Regra: Se há dois ou mais zeros à direita, removemos APENAS 2
  if (zerosFinais >= 2) {
    str = str.substring(0, str.length - 2);
    return str; // Inteiro formatado
  }

  // Se tem 1 zero final, mantemos o zero e colocamos ponto antes do último dígito significativo
  if (zerosFinais === 1) {
    let base = str.substring(0, str.length - 1);
    if (base.length === 1) {
      return '0.' + base;
    }
    return base.substring(0, base.length - 1) + '.' + base.substring(base.length - 1);
  }

  // Se não há zeros finais, inserimos ponto antes dos dois últimos dígitos
  if (str.length <= 2) {
    return '0.' + (str.length === 1 ? '0' + str : str);
  }

  return str.substring(0, str.length - 2) + '.' + str.substring(str.length - 2);
}

// Formata a URL da imagem do produto
function getImageProductCart(imageProduct: any) {
  return imageProduct ? imageProduct.split('-')[0] : null;
}
/*---------------------*/

function sendEventInside(eventName: string, data: any) {
  switch (eventName) {
    case 'home': {
      window.InsiderQueue.push({
        type: 'home'
      });
      window.InsiderQueue.push({
        type: 'init'
      });
      break
    }

    case 'product': {

      console.log('product', data)

      window.InsiderQueue.push({
        type: 'product',
        value: {
          "id": data?.product?.productReference,
          "name": data?.product?.productName,
          "taxonomy": extractCategoryNames(data.product?.categoryTree),
          "unit_price": data?.product?.selectedSku?.sellers[0].commertialOffer?.Price || 0,
          "unit_sale_price": data?.product?.selectedSku?.sellers[0].commertialOffer?.PriceWithoutDiscount || 0,
          "url": data?.product?.detailUrl,
          "product_image_url": getImageProduct(data?.product?.selectedSku?.imageUrl),
          "custom": {
            "isbn": data?.product?.selectedSku?.ean,
            "ean": data?.product?.selectedSku?.ean,
            "modalidade": data?.product?.selectedSku.name
          }
        }
      });
      window.InsiderQueue.push({
        type: "currency",
        value: data?.currency || 'BRL'
      });
      window.InsiderQueue.push({
        type: 'init'
      });

      injectInsiderScript()
      break
    }

    case 'subcategory': {
      console.log('subcategory', data)
      let formattedPaths: any = formatPathSegments(data.pageUrl);
      if (!formattedPaths || formattedPaths.length === 0) {
        return
      }
      window.InsiderQueue.push({
        type: 'category',
        value: formattedPaths
      });
      window.InsiderQueue.push({
        type: 'init'
      });

      injectInsiderScript()
      break
    }

    case 'department': {

      console.log('department', data)
      let formattedPaths: any = formatPathSegments(data.pageUrl);

      if (!formattedPaths || formattedPaths.length === 0) {
        return
      }
      window.InsiderQueue.push({
        type: 'category',
        value: formattedPaths
      });
      window.InsiderQueue.push({
        type: 'init'
      });

      injectInsiderScript()
      break
    }
    case 'addToCart': {

      // Inicialização principal
      let viewItemEvent = getViewItemEvent('add_to_cart', window.dataLayer);
      if (!viewItemEvent || !viewItemEvent.ecommerce || !viewItemEvent.ecommerce.items || !viewItemEvent.ecommerce.items.length) {
        console.log('Dados do produto não encontrados no dataLayer');
      }

      let product = viewItemEvent.ecommerce.items[0];
      let arrayTaxonomy = [];

      if (product.item_category) arrayTaxonomy.push(product.item_category);
      if (product.item_category2) arrayTaxonomy.push(product.item_category2);
      if (product.item_category3) arrayTaxonomy.push(product.item_category3);

      let dataStorage: any = localStorage.getItem('imgAddToCart')
      let lStorage = JSON.parse(dataStorage) || [];
      let objectNew = {
        id: product.item_id,
        img: getImageProductCart(data.imageUrl),
        unit_sale_price: parseFloat(tratarNumero(data.sellingPrice)),
        unit_price: parseFloat(tratarNumero(data.price)),
        custom: {
          isbn: data.ean,
          ean: data.ean,
          modalidade: data.variant
        }
      };

      lStorage.push(objectNew);
      localStorage.setItem('imgAddToCart', JSON.stringify(lStorage));

      window.InsiderQueue.push({
        type: 'currency',
        value: 'BRL'
      });
      //"https://manole.vtexassets.com/arquivos/ids/266973/9788520467961--Medicina-de-Emergencia---19ª-Edicao-Abordagem-pratica.jpg.jpg?v=638799769120100000"
      window.InsiderQueue.push({
        type: 'add_to_cart',
        value: {
          id: data.productId,
          name: data.name,
          taxonomy: arrayTaxonomy,
          unit_price: parseFloat(tratarNumero(data.price)),
          unit_sale_price: parseFloat(tratarNumero(data.sellingPrice)),
          url: window.location.href + data.detailUrl,
          quantity: data.quantity,
          product_image_url: getImageProductCart(data.imageUrl),
          custom: {
            isbn: data.ean,
            ean: data.ean,
            modalidade: data.variant
          }
        }
      });

      injectInsiderScript()
      break
    }

    case 'remove_from_cart': {

      let viewItemEvent = getViewItemEvent("remove_from_cart", window.dataLayer);

      if (!viewItemEvent || !viewItemEvent.ecommerce || !viewItemEvent.ecommerce.items || !viewItemEvent.ecommerce.items.length) {
        console.log('Dados do produto não encontrados no dataLayer');
      }

      let product = viewItemEvent.ecommerce.items[0];
      let arrayTaxonomy = [];

      if (product.item_category) arrayTaxonomy.push(product.item_category);
      if (product.item_category2) arrayTaxonomy.push(product.item_category2);
      if (product.item_category3) arrayTaxonomy.push(product.item_category3);

      let storageData: any = localStorage.getItem('imgAddToCart')
      let lStorage = JSON.parse(storageData)
      let itemId = product.item_id;
      let unit_price: any = ''
      let unit_sale_price: any = ''
      let custom: any = {};
      for (var i = 0; i < lStorage.length; i++) {
        if (lStorage[i].id === itemId) {
          unit_price = lStorage[i].unit_price
          unit_sale_price = lStorage[i].unit_sale_price
          custom = lStorage[i].custom;
          break;
        }
      }

      // Filtra o array para remover o item com o ID especificado
      let newStorage = [];
      for (var j = 0; j < lStorage.length; j++) {
        if (lStorage[j].id !== itemId) {
          newStorage.push(lStorage[j]);
        }
      }
      // Atualiza o localStorage
      localStorage.setItem('imgAddToCart', JSON.stringify(newStorage));

      window.InsiderQueue.push({
        type: 'currency',
        value: 'BRL'
      });

      window.InsiderQueue.push({
        type: 'remove_from_cart',
        value: {
          id: data.productId,
          name: data.name,
          taxonomy: arrayTaxonomy,
          unit_price: unit_price,
          unit_sale_price: unit_sale_price,
          url: window.location.href + data.detailUrl,
          product_image_url: getImageProductCart(data.imageUrl),
          custom: custom
        }
      });

    }

    case 'viewCart': {
      let newItems: any = [];
      for (var i = 0; i < data.length; i++) {
        var item = data[i];
        const taxonomy = item.category.split('/').map((i: any) => i.trim());

        newItems.push({
          id: item.skuId,
          name: item.name,
          taxonomy: taxonomy,
          unit_price: '',
          unit_sale_price: '',
          url: window.location.hostname + item.detailUrl,
          product_image_url: item.imageUrl,
          quantity: item.quantity
        });
      }
      window.InsiderQueue.push({
        type: 'cart', value: {
          "total": '',
          "shipping_cost": '',
          "items": newItems
        }
      });
      window.InsiderQueue.push({
        type: 'currency',
        value: 'BRL'
      });
      window.InsiderQueue.push({
        type: 'init'
      });
    }

    case 'user': {

      let getInsiderQueueUse = localStorage.getItem('insiderQueue');

      if (!getInsiderQueueUse) return
      /*
      window.InsiderQueue.push({
        type: page_type === 'department' ? 'category' : page_type
      });*/
      window.InsiderQueue.push(JSON.parse(getInsiderQueueUse));
      /*
      window.InsiderQueue.push({
        type: 'init'
      });
      */
      injectInsiderScript()

      break
    }
  }
}
export function handleEvents(e: PixelMessage) {
  switch (e.data.eventName) {

    case 'vtex:pageView': {
      const pageType = getPageName((e.data as any).routeId)
      //page_type = pageType

      switch (pageType) {
        case 'home': {
          //injectInsiderScript()
          window.InsiderQueue = window.InsiderQueue || []
          sendEventInside('home', e.data)
          break
        }
        case 'subcategory': {
          window.InsiderQueue = window.InsiderQueue || []
          sendEventInside('subcategory', e.data)
        }

        case 'department': {
          window.InsiderQueue = window.InsiderQueue || []
          sendEventInside('department', e.data)
        }
      }
      break
    }
    case 'vtex:productView': {
      //injectInsiderScript()
      window.InsiderQueue = window.InsiderQueue || []
      sendEventInside('product', e.data)
      break
    }

    case 'vtex:addToCart': {
      const { items } = e.data

      window.InsiderQueue = window.InsiderQueue || []
      sendEventInside('addToCart', items[0])

      return
    }
    case 'vtex:removeFromCart': {
      const { items } = e.data

      window.InsiderQueue = window.InsiderQueue || []
      sendEventInside('remove_from_cart', items[0])

      return
    }

    case 'vtex:cartChanged': {
      const { items } = e.data

      window.InsiderQueue = window.InsiderQueue || []
      console.log('cartChanged ee', e)
      console.log('cartChanged', items)
      sendEventInside('viewCart', items)
      return

    }

    case 'vtex:userData': {
      const { data } = e

      if (!data.isAuthenticated) {
        return
      }

      console.log('userData', e)
      window.InsiderQueue = window.InsiderQueue || []

      sendEventInside('user', data)
      return
    }
    default: {
      break
    }


  }
}

if (canUseDOM) {
  window.addEventListener('message', handleEvents)
}
